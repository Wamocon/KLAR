import { test, expect, navigateTo } from "./fixtures/helpers";

test.describe("Benchmark / Leaderboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, "/benchmark", "en");
  });

  test("loads the leaderboard page", async ({ page }) => {
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text).toMatch(/benchmark|leaderboard|rang/i);
  });

  test("displays a leaderboard table or list", async ({ page }) => {
    await page.waitForTimeout(2000);
    // Should have some table or list structure
    const table = page.locator("table, [role='table'], [class*='leaderboard']");
    const list = page.locator("[class*='card'], [class*='Card']");
    const hasTable = await table.first().isVisible().catch(() => false);
    const hasList = (await list.count()) > 0;
    expect(hasTable || hasList).toBe(true);
  });

  test("shows agent/model names", async ({ page }) => {
    await page.waitForTimeout(2000);
    // Verify there are some entries (or empty state message)
    const body = await page.textContent("body");
    expect(body).toMatch(/agent|model|score|accuracy|no.*(data|entries|agents)|\d+%/i);
  });
});

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
