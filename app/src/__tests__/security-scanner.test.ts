import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanSecurityHeaders } from "@/lib/analysis/security-scanner";

// Mock fetch to avoid real HTTP requests in tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createMockResponse(headers: Record<string, string>) {
  return {
    headers: new Map(Object.entries(headers)),
    text: vi.fn().mockResolvedValue(""),
  };
}

describe("Security Header Scanner", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("scanSecurityHeaders", () => {
    it("should return invalid URL result for bad URLs", async () => {
      const result = await scanSecurityHeaders("not-a-url");
      expect(result.overallScore).toBe(0);
      expect(result.grade).toBe("F");
      expect(result.checks[0].id).toBe("url_invalid");
    });

    it("should detect HTTPS", async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));
      const result = await scanSecurityHeaders("https://example.com");
      const httpsCheck = result.checks.find(c => c.id === "https");
      expect(httpsCheck?.status).toBe("pass");
      expect(result.httpsEnabled).toBe(true);
    });

    it("should fail HTTPS check for HTTP URLs", async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));
      const result = await scanSecurityHeaders("http://example.com");
      const httpsCheck = result.checks.find(c => c.id === "https");
      expect(httpsCheck?.status).toBe("fail");
      expect(result.httpsEnabled).toBe(false);
    });

    it("should pass HSTS check for proper header", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      const hstsCheck = result.checks.find(c => c.id === "hsts");
      expect(hstsCheck?.status).toBe("pass");
    });

    it("should warn on weak HSTS", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "strict-transport-security": "max-age=3600",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      const hstsCheck = result.checks.find(c => c.id === "hsts");
      expect(hstsCheck?.status).toBe("warning");
    });

    it("should pass CSP check for proper policy", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "content-security-policy": "default-src 'self'; script-src 'self'",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      const cspCheck = result.checks.find(c => c.id === "csp");
      expect(cspCheck?.status).toBe("pass");
    });

    it("should warn on unsafe-inline in CSP", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      const cspCheck = result.checks.find(c => c.id === "csp");
      expect(cspCheck?.status).toBe("warning");
    });

    it("should detect X-Content-Type-Options", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "x-content-type-options": "nosniff",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      const xctoCheck = result.checks.find(c => c.id === "xcto");
      expect(xctoCheck?.status).toBe("pass");
    });

    it("should detect X-Frame-Options", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "x-frame-options": "DENY",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      const xfoCheck = result.checks.find(c => c.id === "xfo");
      expect(xfoCheck?.status).toBe("pass");
    });

    it("should warn about server header exposure", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "server": "Apache/2.4.51",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      const serverCheck = result.checks.find(c => c.id === "server_exposure");
      expect(serverCheck?.status).toBe("warning");
    });

    it("should grade well-secured sites highly", async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "content-security-policy": "default-src 'self'; script-src 'self'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "strict-origin-when-cross-origin",
        "permissions-policy": "geolocation=(), camera=()",
      }));
      const result = await scanSecurityHeaders("https://example.com");
      expect(result.overallScore).toBeGreaterThan(70);
      expect(["A+", "A", "B"]).toContain(result.grade);
    });

    it("should return correct interface shape", async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));
      const result = await scanSecurityHeaders("https://example.com");
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("grade");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("checks");
      expect(result).toHaveProperty("httpsEnabled");
      expect(result).toHaveProperty("summary");
      expect(Array.isArray(result.checks)).toBe(true);
    });

    it("should have valid grade values", async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));
      const result = await scanSecurityHeaders("https://example.com");
      expect(["A+", "A", "B", "C", "D", "F"]).toContain(result.grade);
    });

    it("should handle connection failures gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));
      const result = await scanSecurityHeaders("https://example.com");
      expect(result.overallScore).toBe(0);
      expect(result.grade).toBe("F");
    });

    it("should produce non-empty summary", async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));
      const result = await scanSecurityHeaders("https://example.com");
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });
});
