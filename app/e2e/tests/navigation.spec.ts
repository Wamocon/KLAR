import { test, expect, navigateTo } from "./fixtures/helpers";

test.describe("Navigation", () => {
  test("header links navigate correctly", async ({ page }) => {
    await navigateTo(page, "", "en");

    // Navigate to Verify
    const verifyLink = page.locator('a[href*="verify"]').first();
    if (await verifyLink.isVisible()) {
      await verifyLink.click();
      await page.waitForURL("**/verify**");
      expect(page.url()).toContain("/verify");
    }
  });

  test("navigates to Dashboard", async ({ page }) => {
    await navigateTo(page, "/dashboard", "en");
    // Either loads dashboard or redirects to login (both valid)
    const url = page.url();
    expect(url).toMatch(/dashboard|login|auth/);
  });

  test("navigates to History", async ({ page }) => {
    await navigateTo(page, "/history", "en");
    const url = page.url();
    expect(url).toMatch(/history|login|auth/);
  });

  test("navigates to Benchmark", async ({ page }) => {
    await navigateTo(page, "/benchmark", "en");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigates to Tools", async ({ page }) => {
    await navigateTo(page, "/tools", "en");
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text).toMatch(/tool|integration|werkzeug/i);
  });

  test("navigates to Settings", async ({ page }) => {
    await navigateTo(page, "/settings", "en");
    const url = page.url();
    expect(url).toMatch(/settings|login|auth/);
  });

  test("navigates to About", async ({ page }) => {
    await navigateTo(page, "/about", "en");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigates to Privacy", async ({ page }) => {
    await navigateTo(page, "/privacy", "en");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigates to Terms", async ({ page }) => {
    await navigateTo(page, "/terms", "en");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigates to Imprint", async ({ page }) => {
    await navigateTo(page, "/imprint", "en");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigates to Contact", async ({ page }) => {
    await navigateTo(page, "/contact", "en");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("404 page for invalid routes", async ({ page }) => {
    await navigateTo(page, "/nonexistent-page-xyz", "en");
    const body = await page.textContent("body");
    expect(body).toMatch(/not found|404|nicht gefunden/i);
  });
});

test.describe("Navigation — Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile menu toggle works", async ({ page }) => {
    await navigateTo(page, "", "en");

    // Look for mobile menu button (hamburger)
    const menuButton = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i], button:has(svg)').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Menu items should become visible
      await page.waitForTimeout(500);
      const navLinks = page.locator('nav a, [role="navigation"] a');
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("footer links are visible on mobile", async ({ page }) => {
    await navigateTo(page, "", "en");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });
});
