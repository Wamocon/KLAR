import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase
const mockUser = { id: "user-123", email: "test@example.com" };
const mockVerification = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "user-123",
  original_text: "Test text",
  trust_score: 75,
  total_claims: 5,
  supported_count: 4,
  contradicted_count: 1,
  unverifiable_count: 0,
  processing_time_ms: 5000,
  is_public: false,
  source_url: null,
  source_title: null,
};
const mockClaims = [
  {
    id: "claim-1",
    claim_text: "Test claim",
    verdict: "supported",
    confidence: 0.9,
    reasoning: "Well supported",
    sources: [],
    position_start: 0,
    position_end: 10,
  },
];

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

const { GET } = await import("@/app/api/export/route");

describe("API: /api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("GET - Export HTML Report", () => {
    it("returns 400 for missing ID", async () => {
      const request = new NextRequest("http://localhost:3000/api/export");
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 for non-UUID ID", async () => {
      const request = new NextRequest("http://localhost:3000/api/export?id=not-a-uuid");
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("returns 404 when verification not found", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        order: vi.fn().mockReturnThis(),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);
      expect(response.status).toBe(404);
    });

    it("returns HTML content for valid ID", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // verifications query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockVerification }),
          };
        }
        // claims query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockClaims }),
        };
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);

      expect(response.headers.get("Content-Type")).toContain("text/html");
      const html = await response.text();
      expect(html).toContain("KLAR");
      expect(html).toContain("Trust Report");
      expect(html).toContain("75%");
    });

    it("escapes HTML in claim text to prevent XSS", async () => {
      const xssClaim = [{
        ...mockClaims[0],
        claim_text: '<script>alert("xss")</script>',
        reasoning: '<img onerror="alert(1)" src=x>',
      }];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockVerification }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: xssClaim }),
        };
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);
      const html = await response.text();

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("returns 404 for private verification not owned by user", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "different-user", email: "other@test.com" } },
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockVerification, user_id: "user-123", is_public: false },
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);
      expect(response.status).toBe(404);
    });

    it("allows access to public verification by any user", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "different-user", email: "other@test.com" } },
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { ...mockVerification, user_id: "user-123", is_public: true },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockClaims }),
        };
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);
      expect(response.headers.get("Content-Type")).toContain("text/html");
    });

    it("rejects SQL injection attempt in ID parameter", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001' OR 1=1--"
      );
      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it("handles empty claims list", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockVerification }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);
      const html = await response.text();

      expect(response.headers.get("Content-Type")).toContain("text/html");
      expect(html).toContain("Individual Claims (0)");
    });

    it("handles null claims response", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockVerification }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null }),
        };
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);
      const html = await response.text();

      expect(html).toContain("KLAR");
    });

    it("escapes special characters in source URL and title", async () => {
      const claimWithSources = [{
        ...mockClaims[0],
        sources: [{ title: 'Source & "Title"', url: "https://example.com/?q=a&b=c" }],
      }];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { ...mockVerification, source_url: "https://example.com", source_title: "Test & <Source>" },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: claimWithSources }),
        };
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);
      const html = await response.text();

      expect(html).not.toContain("Test & <Source>");
      expect(html).toContain("Test &amp; &lt;Source&gt;");
    });

    it("handles uppercase UUID", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        order: vi.fn().mockReturnThis(),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-00000000000A"
      );
      const response = await GET(request);
      // Uppercase hex is valid UUID, should pass validation
      expect([200, 404]).toContain(response.status);
    });

    it("sets Content-Disposition header for download", async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockVerification }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockClaims }),
        };
      });

      const request = new NextRequest(
        "http://localhost:3000/api/export?id=00000000-0000-0000-0000-000000000001"
      );
      const response = await GET(request);

      expect(response.headers.get("Content-Disposition")).toContain("klar-report");
    });
  });
});
