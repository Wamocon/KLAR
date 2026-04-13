import { test, expect } from "@playwright/test";

/**
 * Regression tests for critical bugs fixed in recent sessions.
 * These ensure previously-broken features STAY working.
 */

const API_BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("REGRESSION: Extension API must return JSON, never HTML", () => {
  // Bug: Vercel was returning HTML 404 pages instead of JSON for extension endpoints
  // because routes weren't deployed. This test catches deployment gaps.
  const endpoints = [
    "/api/extension/extract",
    "/api/extension/judge",
    "/api/extension/validate",
    "/api/extension/scan",
  ];

  for (const endpoint of endpoints) {
    test(`${endpoint} returns JSON content type`, async ({ request }) => {
      const res = await request.post(`${API_BASE}${endpoint}`, {
        data: { text: "test" },
      });
      const ct = res.headers()["content-type"] || "";
      expect(ct).toContain("json");
      const body = await res.text();
      expect(body.startsWith("{") || body.startsWith("[")).toBeTruthy();
    });
  }
});

test.describe("REGRESSION: URL extraction must not crash with ESM errors", () => {
  // Bug: jsdom v29 uses ESM-only deps (html-encoding-sniffer) that crash on Vercel
  // Fix: Replaced jsdom with linkedom

  test("extract endpoint with URL does not throw ERR_REQUIRE_ESM", async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/extension/extract`, {
      data: { url: "https://example.com", language: "en" },
    });
    const body = await res.json();
    // Should get auth error, not ESM crash
    if (res.status() >= 500) {
      expect(body.error).not.toContain("ERR_REQUIRE_ESM");
      expect(body.error).not.toContain("encoding-sniffer");
      expect(body.error).not.toContain("jsdom");
    }
  });

  test("verify endpoint with URL does not throw ESM errors", async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/verify`, {
      data: { url: "https://example.com", mode: "url", language: "en" },
    });
    const body = await res.text();
    expect(body).not.toContain("ERR_REQUIRE_ESM");
    expect(body).not.toContain("encoding-sniffer");
  });
});

test.describe("REGRESSION: API security headers", () => {
  test("X-Content-Type-Options: nosniff on all pages", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test("X-Frame-Options: DENY to prevent clickjacking", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  test("CSP header is set", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["content-security-policy"]).toBeTruthy();
  });
});

test.describe("REGRESSION: Internationalization routing", () => {
  test("/ redirects to /en or /de based on locale", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const url = page.url();
    expect(url).toMatch(/\/(en|de)\/?/);
  });

  test("/en loads English content", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("en");
  });

  test("/de loads German content", async ({ page }) => {
    await page.goto("/de");
    await page.waitForLoadState("domcontentloaded");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("de");
  });
});

test.describe("REGRESSION: Verify page stability", () => {
  test("verify page loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/en/verify");
    await page.waitForLoadState("domcontentloaded");

    // Filter out known acceptable errors (e.g., analytics)
    const criticalErrors = errors.filter(
      (e) => !e.includes("analytics") && !e.includes("gtag")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("verify page has text input area", async ({ page }) => {
    await page.goto("/en/verify");
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10000 });
  });

  test("verify page has submit button", async ({ page }) => {
    await page.goto("/en/verify");
    const btn = page.getByRole("button", { name: /verify|analyze|check|prüf/i });
    await expect(btn).toBeVisible({ timeout: 10000 });
  });
});

test.describe("REGRESSION: Landing page accessibility", () => {
  test("landing page loads", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("landing page has main heading", async ({ page }) => {
    await page.goto("/en");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
  });

  test("landing page has navigation", async ({ page }) => {
    await page.goto("/en");
    const nav = page.locator("nav, header, [role='navigation']").first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });
});

test.describe("REGRESSION: SEO and metadata", () => {
  test("robots.txt is accessible", async ({ request }) => {
    const res = await request.get(`${API_BASE}/robots.txt`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("User-agent");
  });

  test("sitemap.xml is accessible", async ({ request }) => {
    const res = await request.get(`${API_BASE}/sitemap.xml`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("urlset");
  });

  test("manifest.json is accessible", async ({ request }) => {
    const res = await request.get(`${API_BASE}/manifest.json`);
    expect(res.status()).toBe(200);
  });
});
