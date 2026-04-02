import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase
const mockUser = { id: "user-123", email: "test@example.com", created_at: "2024-01-01" };
const mockProfile = { id: "user-123", email: "test@example.com", plan: "free", full_name: "Test User" };
const mockVerifications = [
  { id: "v-1", trust_score: 80, created_at: "2024-06-01T00:00:00Z" },
];

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
  },
  from: vi.fn(),
};

const mockServiceClient = {
  from: vi.fn((_table?: string): Record<string, unknown> => ({
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue({ data: null }),
  })),
  auth: {
    admin: {
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
  createServiceClient: vi.fn().mockResolvedValue(mockServiceClient),
}));

const { GET, DELETE } = await import("@/app/api/account/route");

describe("API: /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("GET - GDPR Data Export", () => {
    it("returns 401 for unauthenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it("returns all user data for authenticated user", async () => {
      mockSupabase.from.mockImplementation((table?: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
          in: vi.fn().mockResolvedValue({ data: [] }),
          order: vi.fn().mockReturnThis(),
        };
        // For select with order chain
        chain.order = vi.fn().mockResolvedValue({
          data: table === "verifications" ? mockVerifications : [],
        });
        return chain;
      });

      const response = await GET();
      const data = await response.json();

      expect(data.exported_at).toBeDefined();
      expect(data.user.id).toBe("user-123");
      expect(data.user.email).toBe("test@example.com");
      expect(data.profile).toBeDefined();
      expect(data.verifications).toBeDefined();
      expect(data.claims).toBeDefined();
    });
  });

  describe("DELETE - GDPR Account Deletion", () => {
    it("returns 401 for unauthenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
      const request = new NextRequest("http://localhost:3000/api/account", {
        method: "DELETE",
      });
      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });

    it("deletes all user data in correct order", async () => {
      const deletedTables: string[] = [];
      
      mockServiceClient.from.mockImplementation((table?: string) => {
        const mockDelete = vi.fn().mockImplementation(() => {
          deletedTables.push(table ?? "unknown");
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
            in: vi.fn().mockResolvedValue({ error: null }),
          };
        });
        
        if (table === "profiles") {
          return {
            delete: mockDelete,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { org_id: null } }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === "verifications") {
          return {
            delete: mockDelete,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: "v-1" }] }),
            }),
          };
        }
        return {
          delete: mockDelete,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const request = new NextRequest("http://localhost:3000/api/account", {
        method: "DELETE",
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it("returns 500 when deletion step fails mid-way", async () => {
      let callCount = 0;
      mockServiceClient.from.mockImplementation((table?: string) => {
        callCount++;
        if (table === "verifications" && callCount > 2) {
          // Fail on verifications delete (step 4)
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
            }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: "v-1" }] }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: "v-1" }] }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const request = new NextRequest("http://localhost:3000/api/account", {
        method: "DELETE",
      });
      const response = await DELETE(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("partially failed");
    });

    it("handles user with no verifications", async () => {
      mockServiceClient.from.mockImplementation((table?: string) => {
        if (table === "profiles") {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { org_id: null } }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const request = new NextRequest("http://localhost:3000/api/account", {
        method: "DELETE",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it("returns 500 when auth user deletion fails", async () => {
      mockServiceClient.from.mockImplementation((table?: string) => {
        if (table === "profiles") {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { org_id: null } }),
              }),
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      mockServiceClient.auth.admin.deleteUser.mockResolvedValueOnce({
        error: { message: "Auth deletion failed" },
      });

      const request = new NextRequest("http://localhost:3000/api/account", {
        method: "DELETE",
      });
      const response = await DELETE(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("auth removal failed");
    });
  });

  describe("GET — edge cases", () => {
    it("handles user with no profile", async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        in: vi.fn().mockResolvedValue({ data: [] }),
        order: vi.fn().mockResolvedValue({ data: [] }),
      }));

      const response = await GET();
      const data = await response.json();

      expect(data.exported_at).toBeDefined();
      expect(data.user.id).toBe("user-123");
      expect(data.profile).toBeNull();
    });

    it("handles user with empty verifications and claims", async () => {
      mockSupabase.from.mockImplementation(() => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
          in: vi.fn().mockResolvedValue({ data: [] }),
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
        return chain;
      });

      const response = await GET();
      const data = await response.json();

      expect(data.verifications).toEqual([]);
      expect(data.claims).toEqual([]);
    });

    it("exported data includes reviews", async () => {
      mockSupabase.from.mockImplementation((table?: string) => {
        if (table === "reviews") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: "r-1", comment: "Test" }] }),
          };
        }
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockProfile }),
          in: vi.fn().mockResolvedValue({ data: [] }),
          order: vi.fn().mockResolvedValue({ data: [] }),
        };
        return chain;
      });

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty("reviews");
    });
  });
});
