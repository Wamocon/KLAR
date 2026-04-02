import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
const mockUser = { id: "user-123", email: "test@example.com", created_at: "2024-01-01" };
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { plan: "free", monthly_verification_count: 3, monthly_reset_at: new Date(Date.now() + 86400000).toISOString() } }),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Must import the module AFTER mocking
const { GET } = await import("@/app/api/usage/route");

describe("API: /api/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - Usage Info", () => {
    it("returns guest plan for unauthenticated users", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
      const response = await GET();
      const data = await response.json();

      expect(data.plan).toBe("guest");
      expect(data.limit).toBe(3);
      expect(data.allowedModes).toEqual(["fact-check"]);
    });

    it("returns usage data for authenticated user", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.plan).toBe("free");
      expect(data.used).toBeDefined();
      expect(data.limit).toBeDefined();
      expect(data.remaining).toBeDefined();
      expect(data.maxChars).toBeDefined();
      expect(data.allowedModes).toBeDefined();
    });

    it("returns correct remaining count", async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.remaining).toBe(data.limit - data.used);
    });

    it("returns 404 when profile not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser } });
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      });

      const response = await GET();
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("Profile not found");
    });

    it("resets used count when monthly_reset_at is in the past", async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan: "free",
            monthly_verification_count: 25,
            monthly_reset_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
          },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.used).toBe(0);
      expect(data.remaining).toBe(data.limit);
    });

    it("handles unknown plan type by falling back to free defaults", async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan: null, // null plan → defaults to "free"
            monthly_verification_count: 0,
            monthly_reset_at: new Date(Date.now() + 86400000).toISOString(),
          },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.plan).toBe("free");
      expect(data.limit).toBeDefined();
      expect(data.remaining).toBeDefined();
    });

    it("returns non-negative remaining even when used exceeds limit", async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan: "free",
            monthly_verification_count: 99999,
            monthly_reset_at: new Date(Date.now() + 86400000).toISOString(),
          },
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(data.remaining).toBeGreaterThanOrEqual(0);
    });

    it("guest plan always returns consistent shape", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty("plan");
      expect(data).toHaveProperty("used");
      expect(data).toHaveProperty("limit");
      expect(data).toHaveProperty("remaining");
      expect(data).toHaveProperty("maxChars");
      expect(data).toHaveProperty("allowedModes");
      expect(data.resetAt).toBeNull();
    });
  });
});
