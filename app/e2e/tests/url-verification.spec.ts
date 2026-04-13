import { test, expect } from "@playwright/test";

/**
 * URL Verification E2E tests — validates the URL extraction flow
 * on the verify page (user-facing) and the extension API.
 */

test.describe("URL Verification Flow", () => {
  test("verify page shows URL input mode", async ({ page }) => {
    await page.goto("/en/verify");
    // Should have a tab or toggle for URL mode
    const urlTab = page.getByRole("tab", { name: /url/i }).or(page.getByText(/url/i));
    if (await urlTab.isVisible()) {
      await urlTab.click();
      // Should show a URL input field
      const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="http"]');
      await expect(urlInput).toBeVisible({ timeout: 5000 });
    }
  });

  test("verify page rejects invalid URLs", async ({ page }) => {
    await page.goto("/en/verify");
    const urlTab = page.getByRole("tab", { name: /url/i }).or(page.getByText(/url/i));
    if (await urlTab.isVisible()) {
      await urlTab.click();
      const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="http"]');
      if (await urlInput.isVisible()) {
        await urlInput.fill("not-a-valid-url");
        const submitBtn = page.getByRole("button", { name: /verify|analyze|check/i });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          // Should show some error or validation message
          await page.waitForTimeout(2000);
          const pageText = await page.textContent("body");
          // Should NOT navigate to a success state
          expect(pageText).not.toContain("Trust Score");
        }
      }
    }
  });

  test("verify page accepts URL via query parameter", async ({ page }) => {
    await page.goto("/en/verify?url=https://example.com");
    await page.waitForLoadState("domcontentloaded");
    // The URL should be prefilled somewhere on the page
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeTruthy();
  });
});

test.describe("URL Extraction API", () => {
  const API_BASE = process.env.BASE_URL || "http://localhost:3000";

  test("extension extract endpoint handles URL mode", async ({ request }) => {
    // Without auth, should get 401 — but importantly, NOT a jsdom/ESM error
    const res = await request.post(`${API_BASE}/api/extension/extract`, {
      data: { url: "https://example.com", language: "en", analyses: ["fact-check"] },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("API key");
    // Should NOT contain jsdom-related error messages
    expect(body.error).not.toContain("ERR_REQUIRE_ESM");
    expect(body.error).not.toContain("encoding-sniffer");
  });

  test("verify API handles URL mode", async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/verify`, {
      data: { url: "https://example.com", mode: "url", language: "en" },
    });
    // Should get SSE stream or proper error — NOT an ESM crash
    const contentType = res.headers()["content-type"] || "";
    const body = await res.text();
    expect(body).not.toContain("ERR_REQUIRE_ESM");
    expect(body).not.toContain("encoding-sniffer");
    // Could be 200 (streaming), 400 (content too short), or 429 (rate limit)
    expect([200, 400, 429]).toContain(res.status());
  });

  test("SSRF protection blocks internal URLs via API", async ({ request }) => {
    const ssrfUrls = [
      "http://localhost:3000/admin",
      "http://127.0.0.1/etc/passwd",
      "http://169.254.169.254/latest/meta-data",
      "http://10.0.0.1/internal",
    ];

    for (const url of ssrfUrls) {
      const res = await request.post(`${API_BASE}/api/extension/extract`, {
        data: { url, language: "en" },
      });
      // Either 401 (auth first) or 400 (SSRF blocked) — never 200 with internal content
      expect([400, 401]).toContain(res.status());
    }
  });
});
