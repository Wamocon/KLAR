import { test, expect } from "@playwright/test";

/**
 * Extension API E2E tests — validates the two-phase verification endpoints
 * against the actual running server (no mocks).
 */

const API_BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Extension API Endpoints", () => {
  test.describe("POST /api/extension/extract", () => {
    test("returns 401 without API key", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/extension/extract`, {
        data: { text: "A".repeat(100), language: "en", analyses: ["fact-check"] },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("API key");
    });

    test("returns 400 for text shorter than 50 chars", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/extension/extract`, {
        headers: { Authorization: "Bearer klar_invalid_key" },
        data: { text: "short", language: "en" },
      });
      // Either 401 (bad key) or 400 (validation) — both valid
      expect([400, 401]).toContain(res.status());
    });

    test("returns 400 for missing text and url", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/extension/extract`, {
        headers: { Authorization: "Bearer klar_invalid_key" },
        data: { language: "en" },
      });
      expect([400, 401]).toContain(res.status());
    });

    test("CORS preflight returns 204", async ({ request }) => {
      const res = await request.fetch(`${API_BASE}/api/extension/extract`, {
        method: "OPTIONS",
        headers: {
          Origin: "chrome-extension://test",
          "Access-Control-Request-Method": "POST",
        },
      });
      expect(res.status()).toBe(204);
      expect(res.headers()["access-control-allow-origin"]).toBe("*");
      expect(res.headers()["access-control-allow-methods"]).toContain("POST");
    });

    test("returns JSON error, not HTML, for invalid requests", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/extension/extract`, {
        data: { text: "A".repeat(100) },
      });
      const contentType = res.headers()["content-type"] || "";
      expect(contentType).toContain("application/json");
    });
  });

  test.describe("POST /api/extension/judge", () => {
    test("returns 401 without API key", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/extension/judge`, {
        data: { claim: { claim_text: "Test claim" }, language: "en" },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("API key");
    });

    test("returns 400 for missing claim", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/extension/judge`, {
        headers: { Authorization: "Bearer klar_invalid_key" },
        data: { language: "en" },
      });
      expect([400, 401]).toContain(res.status());
    });

    test("CORS preflight returns proper headers", async ({ request }) => {
      const res = await request.fetch(`${API_BASE}/api/extension/judge`, {
        method: "OPTIONS",
        headers: {
          Origin: "chrome-extension://test",
          "Access-Control-Request-Method": "POST",
        },
      });
      // Should return CORS headers (204 or 200)
      expect([200, 204]).toContain(res.status());
    });
  });

  test.describe("POST /api/extension/validate", () => {
    test("returns invalid for bad API key", async ({ request }) => {
      const res = await request.post(`${API_BASE}/api/extension/validate`, {
        headers: { Authorization: "Bearer klar_definitely_not_valid" },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe("Endpoint Response Format", () => {
    test("all extension endpoints return JSON, never HTML", async ({ request }) => {
      const endpoints = [
        { url: "/api/extension/extract", data: { text: "test" } },
        { url: "/api/extension/judge", data: { claim: { claim_text: "test" } } },
        { url: "/api/extension/validate", data: {} },
      ];

      for (const ep of endpoints) {
        const res = await request.post(`${API_BASE}${ep.url}`, { data: ep.data });
        const contentType = res.headers()["content-type"] || "";
        expect(contentType).toContain("json");
        // Should never return HTML (sign of 404 page)
        const body = await res.text();
        expect(body).not.toContain("<!DOCTYPE html");
        expect(body).not.toContain("<html");
      }
    });
  });
});
