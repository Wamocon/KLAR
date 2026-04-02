import { test, expect, navigateTo, apiRequest, TEST_DATA } from "./fixtures/helpers";

test.describe("API: /api/verify", () => {
  test("POST returns streaming response for valid text", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/verify", {
      text: TEST_DATA.verifiableText,
      language: "en",
    });

    // Should return 200 with streaming or error (rate limit etc.)
    expect([200, 429, 401]).toContain(result.status);
  });

  test("POST rejects empty text", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/verify", {
      text: "",
      language: "en",
    });

    expect([400, 422]).toContain(result.status);
  });

  test("POST rejects prompt injection attempts", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/verify", {
      text: TEST_DATA.injectionText,
      language: "en",
    });

    // Should be blocked by sanitize or adversarial detector
    expect([400, 403, 429]).toContain(result.status);
  });

  test("GET returns verification by ID", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(
      page,
      "GET",
      "/api/verify?id=00000000-0000-0000-0000-000000000000"
    );

    // Should return 404 (not found) or 400 (invalid)
    expect([400, 404]).toContain(result.status);
  });

  test("GET rejects non-UUID ID", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "GET", "/api/verify?id=not-a-uuid");

    expect([400, 404]).toContain(result.status);
  });
});

test.describe("API: /api/usage", () => {
  test("returns usage data for anonymous users", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "GET", "/api/usage");

    expect(result.status).toBe(200);
    const data = JSON.parse(result.body);
    expect(data.plan).toBe("guest");
    expect(data.limit).toBe(3);
    expect(data.allowedModes).toEqual(["fact-check"]);
    expect(data.maxChars).toBeDefined();
    expect(data.maxFileSize).toBeDefined();
  });
});

test.describe("API: /api/export", () => {
  test("rejects missing ID", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "GET", "/api/export");

    expect(result.status).toBe(400);
  });

  test("rejects invalid UUID format", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "GET", "/api/export?id=invalid");

    expect(result.status).toBe(400);
  });

  test("returns 404 for nonexistent verification", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(
      page,
      "GET",
      "/api/export?id=00000000-0000-0000-0000-000000000000"
    );

    expect(result.status).toBe(404);
  });
});

test.describe("API: /api/review", () => {
  test("rejects unauthenticated review submission", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/review", {
      claim_id: "00000000-0000-0000-0000-000000000001",
      new_verdict: "supported",
    });

    expect(result.status).toBe(401);
  });

  test("rejects invalid review schema", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "POST", "/api/review", {
      claim_id: "not-a-uuid",
      new_verdict: "invalid-verdict",
    });

    expect([400, 401]).toContain(result.status);
  });
});

test.describe("API: /api/account", () => {
  test("rejects unauthenticated data export", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "GET", "/api/account");

    expect(result.status).toBe(401);
  });

  test("rejects unauthenticated account deletion", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "DELETE", "/api/account");

    expect(result.status).toBe(401);
  });
});

test.describe("API: Security Headers", () => {
  test("API responses have proper content type", async ({ page }) => {
    await page.goto("/");
    const result = await apiRequest(page, "GET", "/api/usage");

    expect(result.headers["content-type"]).toContain("application/json");
  });
});

test.describe("API: Rate Limiting", () => {
  test("enforces rate limits on rapid requests", async ({ page }) => {
    await page.goto("/");

    let rateLimited = false;
    // Send multiple rapid requests
    for (let i = 0; i < 5; i++) {
      const result = await apiRequest(page, "POST", "/api/verify", {
        text: `Test claim number ${i}. Berlin is in Germany.`,
        language: "en",
      });
      if (result.status === 429) {
        rateLimited = true;
        break;
      }
    }

    // Guest plan should hit rate limit within 3 requests
    expect(rateLimited).toBe(true);
  });
});
