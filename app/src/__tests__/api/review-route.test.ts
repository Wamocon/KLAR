import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase
const mockUser = { id: "user-123", email: "test@example.com" };
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("zod/v4", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zod/v4")>();
  return actual;
});

const { POST } = await import("@/app/api/review/route");

describe("API: /api/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("POST - Submit Review", () => {
    it("returns 401 for unauthenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          new_verdict: "supported",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 for invalid input schema", async () => {
      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({ claim_id: "not-a-uuid", new_verdict: "invalid" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 404 when claim not found", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      });

      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          new_verdict: "supported",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("accepts XSS payload in comment (sanitization at render time, not schema)", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      });

      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          new_verdict: "supported",
          comment: '<script>alert("xss")</script>',
        }),
      });

      const response = await POST(request);
      // Passes zod validation (XSS is just a string), hits claim lookup → 404
      expect(response.status).toBe(404);
    });

    it("rejects comment exceeding 1000 characters", async () => {
      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          new_verdict: "supported",
          comment: "x".repeat(1001),
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("accepts comment at exactly 1000 characters", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      });

      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          new_verdict: "supported",
          comment: "x".repeat(1000),
        }),
      });

      const response = await POST(request);
      // Passes validation, hits claim lookup → 404
      expect(response.status).toBe(404);
    });

    it("rejects invalid verdict value", async () => {
      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "00000000-0000-0000-0000-000000000001",
          new_verdict: "maybe",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("rejects empty body", async () => {
      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 403 when claim belongs to different user", async () => {
      // First call: claim lookup returns claim belonging to different verification
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: "claim-1", verdict: "unverifiable", verification_id: "v-1" },
            }),
          };
        }
        // Second call: verification ownership check — different user
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { user_id: "different-user-999" },
          }),
        };
      });

      // Use RFC 4122 compliant UUID (zod v4 validates version/variant bits)
      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          new_verdict: "supported",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Access denied");
    });

    it("handles successful review submission", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Claim lookup
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: "claim-1", verdict: "unverifiable", verification_id: "v-1" },
            }),
          };
        }
        if (callCount === 2) {
          // Verification ownership check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { user_id: "user-123" },
            }),
          };
        }
        if (callCount === 3) {
          // Insert review
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "review-1" },
                  error: null,
                }),
              }),
            }),
          };
        }
        // Audit log insert
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      // Use RFC 4122 compliant UUID (zod v4 validates version/variant bits)
      const request = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          claim_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          new_verdict: "supported",
          comment: "Looks correct to me",
        }),
        headers: { "x-forwarded-for": "1.2.3.4" },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.review_id).toBe("review-1");
    });
  });
});
