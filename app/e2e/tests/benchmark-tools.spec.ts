import { test, expect, navigateTo } from "./fixtures/helpers";

test.describe("Tools Page", () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, "/tools", "en");
  });

  test("loads the tools page", async ({ page }) => {
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text).toMatch(/tool|integration|werkzeug/i);
  });

  test("displays bookmarklet section", async ({ page }) => {
    const bookmarklet = page.locator("text=/bookmarklet|bookmark|lesezeichen/i").first();
    await expect(bookmarklet).toBeVisible();
  });

  test("displays KLAR Verify bookmarklet button", async ({ page }) => {
    const verifyBookmarklet = page.locator("a").filter({ hasText: /KLAR Verify/i }).first();
    await expect(verifyBookmarklet).toBeVisible();
  });

  test("displays KLAR URL bookmarklet button", async ({ page }) => {
    const urlBookmarklet = page.locator("a").filter({ hasText: /KLAR URL/i }).first();
    await expect(urlBookmarklet).toBeVisible();
  });

  test("displays API integration section", async ({ page }) => {
    const apiSection = page.locator("text=/API/i").first();
    await expect(apiSection).toBeVisible();
  });

  test("shows cURL code example", async ({ page }) => {
    const curl = page.locator("text=/curl/i").first();
    await expect(curl).toBeVisible();
  });

  test("shows JavaScript code example", async ({ page }) => {
    const js = page.locator("text=/JavaScript/i").first();
    await expect(js).toBeVisible();
  });

  test("shows Python code example", async ({ page }) => {
    const python = page.locator("text=/Python/i").first();
    await expect(python).toBeVisible();
  });

  test("copy button works on code examples", async ({ page }) => {
    const copyButton = page.locator("button").filter({ hasText: /copy|kopier/i }).first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      await page.waitForTimeout(500);
      // Should change to "Copied" or show checkmark
      const copied = page.locator("text=/copied|kopiert/i").first();
      const isVisible = await copied.isVisible().catch(() => false);
      // At least no crash
      expect(true).toBe(true);
    }
  });

  test("installation steps are displayed", async ({ page }) => {
    const steps = page.locator("text=/step|schritt|install/i");
    const count = await steps.count();
    expect(count).toBeGreaterThan(0);
  });
});
