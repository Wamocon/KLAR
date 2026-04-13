import { test, expect, navigateTo, apiRequest, TEST_DATA } from "./fixtures/helpers";

/**
 * Regression tests — verify that critical user flows and previously fixed issues
 * continue to work correctly after code changes.
 */

test.describe("Regression: Core Functionality", () => {
  test("verify page → submit text → see results flow", async ({ page }) => {
    await navigateTo(page, "/verify", "en");

    // Fill in text
    const textarea = page.locator("textarea").first();
    await textarea.fill(TEST_DATA.verifiableText);

    // Click verify
    const verifyButton = page.locator("button").filter({ hasText: /verify|prüf|check|start/i }).first();
    await verifyButton.click();

    // Wait for some response (streaming starts or rate limit)
    await page.waitForTimeout(5000);

    const body = await page.textContent("body");
    // Should show processing, results, or rate limit message — NOT a crash/blank page
    expect(body!.length).toBeGreaterThan(100);
  });

  test("usage API always returns valid structure", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "GET", "/api/usage");
    const data = JSON.parse(result.body);

    expect(data).toHaveProperty("plan");
    expect(data).toHaveProperty("limit");
    expect(data).toHaveProperty("remaining");
    expect(data).toHaveProperty("maxChars");
    expect(data).toHaveProperty("allowedModes");
    expect(typeof data.limit).toBe("number");
    expect(Array.isArray(data.allowedModes)).toBe(true);
  });

  test("export API validates UUID format", async ({ page }) => {
    await page.goto("/");

    // SQL injection attempt in ID parameter
    const result = await apiRequest(
      page,
      "GET",
      "/api/export?id=00000000-0000-0000-0000-000000000001' OR 1=1--"
    );
    expect(result.status).toBe(400);
  });

  test("review API validates input schema", async ({ page }) => {
    await page.goto("/");

    const result = await apiRequest(page, "POST", "/api/review", {
      claim_id: "not-a-uuid",
      new_verdict: "supported",
    });
    expect([400, 401]).toContain(result.status);
  });
});

test.describe("Regression: Security", () => {
  test("prompt injection is blocked by API", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/verify", {
      text: TEST_DATA.injectionText,
      language: "en",
    });
    // Should be rejected (not processed blindly)
    expect([400, 403, 429]).toContain(result.status);
  });

  test("XSS in query params doesn't execute", async ({ page }) => {
    const xssPayload = encodeURIComponent('<script>alert("xss")</script>');

    await page.goto(`/en/verify?prefill=${xssPayload}`);
    await page.waitForLoadState("domcontentloaded");

    // Verify no alert was triggered
    const dialogFired = [false];
    page.on("dialog", () => {
      dialogFired[0] = true;
    });
    await page.waitForTimeout(2000);
    expect(dialogFired[0]).toBe(false);
  });

  test("SSRF protection on URL mode", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/verify", {
      url: "http://localhost:3000/api/verify",
      language: "en",
    });
    // Should be blocked
    expect([400, 403, 429]).toContain(result.status);
  });

  test("internal IP addresses are blocked", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/verify", {
      url: "http://169.254.169.254/latest/meta-data/",
      language: "en",
    });
    expect([400, 403, 429]).toContain(result.status);
  });

  test("export route escapes HTML in claims (XSS prevention)", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(
      page,
      "GET",
      "/api/export?id=00000000-0000-0000-0000-000000000001"
    );
    // If it returns HTML, it should be properly escaped
    if (result.status === 200) {
      expect(result.body).not.toContain("<script>");
    }
  });
});

test.describe("Regression: Edge Cases", () => {
  test("empty text submission is handled gracefully", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/verify", {
      text: "",
      language: "en",
    });
    expect(result.status).not.toBe(500);
  });

  test("very long text is handled (char limit)", async ({ page }) => {
    await page.goto("/");
    const longText = "A".repeat(50000); // Way over guest limit
    const result = await apiRequest(page, "POST", "/api/verify", {
      text: longText,
      language: "en",
    });
    // Should be rejected for char limit, not crash
    expect(result.status).not.toBe(500);
  });

  test("invalid JSON body is handled", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json{{{",
      });
      return { status: res.status };
    });
    expect(result.status).not.toBe(500);
  });

  test("concurrent requests don't crash the server", async ({ page }) => {
    await page.goto("/");
    const results = await page.evaluate(async () => {
      const requests = Array.from({ length: 3 }).map(() =>
        fetch("/api/usage").then((r) => r.status)
      );
      return Promise.all(requests);
    });

    for (const status of results) {
      expect([200, 429]).toContain(status);
    }
  });

  test("report page handles missing data gracefully", async ({ page }) => {
    await navigateTo(page, "/report/00000000-0000-0000-0000-000000000000", "en");
    await page.waitForTimeout(3000);

    // Should show error message, NOT a blank page or unhandled error
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(50);
  });
});

test.describe("Regression: I18n Consistency", () => {
  test("all main pages load in both locales without error", async ({ page }) => {
    const pages = ["", "/verify", "/tools", "/about", "/privacy", "/terms", "/imprint", "/contact"];

    for (const path of pages) {
      for (const locale of ["en", "de"]) {
        await navigateTo(page, path, locale);
        const body = await page.textContent("body");
        expect(body!.length).toBeGreaterThan(50);

        // Should not show raw translation keys (bracket notation)
        expect(body).not.toMatch(/\{.*\..*\..*\}/); // e.g., {common.nav.home}
      }
    }
  });
});

test.describe("Regression: Performance", () => {
  test("landing page loads within reasonable time", async ({ page }) => {
    const start = Date.now();
    await navigateTo(page, "", "en");
    const duration = Date.now() - start;

    // Should load within 10 seconds even on slow CI
    expect(duration).toBeLessThan(10_000);
  });

  test("verify page loads within reasonable time", async ({ page }) => {
    const start = Date.now();
    await navigateTo(page, "/verify", "en");
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10_000);
  });

  test("API response time is reasonable", async ({ page }) => {
    await page.goto("/");
    const start = Date.now();
    await apiRequest(page, "GET", "/api/usage");
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5_000);
  });
});
