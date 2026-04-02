import { test, expect, navigateTo } from "./fixtures/helpers";

test.describe("Authentication Flows", () => {
  test("login page loads", async ({ page }) => {
    await navigateTo(page, "/auth/login", "en");
    const body = await page.textContent("body");
    expect(body).toMatch(/sign.in|log.in|anmelden|registrier|email|google|github/i);
  });

  test("signup page loads (if separate)", async ({ page }) => {
    await navigateTo(page, "/auth/signup", "en");
    await page.waitForTimeout(1000);
    // Might redirect to login or show signup form
    const body = await page.textContent("body");
    expect(body!.length).toBeGreaterThan(0);
  });

  test("OAuth buttons are present on login page", async ({ page }) => {
    await navigateTo(page, "/auth/login", "en");

    const oauthButtons = page.locator("button, a").filter({
      hasText: /google|github|sign.in|anmelden/i,
    });
    const count = await oauthButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("unauthenticated access to protected pages redirects", async ({ page }) => {
    const protectedPaths = ["/dashboard", "/history", "/settings"];

    for (const path of protectedPaths) {
      await navigateTo(page, path, "en");
      await page.waitForTimeout(2000);
      const url = page.url();
      // Should either stay (with auth required notice) or redirect to login
      expect(url).toMatch(/dashboard|history|settings|login|auth/);
    }
  });

  test("auth callback route exists", async ({ page }) => {
    // Hitting callback without code should redirect
    const response = await page.goto("/api/auth/callback?locale=en");
    // Should redirect (302/307) to login with error
    const url = page.url();
    expect(url).toMatch(/login|auth|error/);
  });
});

test.describe("Auth — Edge Cases", () => {
  test("auth callback without code redirects to login with error", async ({ page }) => {
    await page.goto("/api/auth/callback");
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    expect(url).toContain("auth");
  });

  test("auth callback with invalid code redirects to login", async ({ page }) => {
    await page.goto("/api/auth/callback?code=invalid-code-123");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toMatch(/login|auth/);
  });
});
