import { test, expect, navigateTo, waitForHydration } from "./fixtures/helpers";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, "", "en");
  });

  test("loads the homepage with correct title", async ({ page }) => {
    const title = await page.title();
    expect(title.toLowerCase()).toContain("klar");
  });

  test("displays the hero section", async ({ page }) => {
    // Hero should have a heading
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("displays the main CTA button", async ({ page }) => {
    // Should have a main call-to-action linking to verify
    const cta = page.locator('a[href*="verify"], button').filter({ hasText: /verify|check|start|prüf/i }).first();
    await expect(cta).toBeVisible();
  });

  test("displays 'How it works' section", async ({ page }) => {
    const howItWorks = page.locator("text=/how it works|so funktioniert/i").first();
    await expect(howItWorks).toBeVisible();
  });

  test("displays analysis capabilities grid", async ({ page }) => {
    // Look for feature cards
    const cards = page.locator('[class*="card"], [class*="Card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("displays pricing section", async ({ page }) => {
    const pricing = page.locator("text=/pricing|pric|kostenlos|free/i").first();
    await expect(pricing).toBeVisible();
  });

  test("header navigation is present", async ({ page }) => {
    const nav = page.locator("header, nav").first();
    await expect(nav).toBeVisible();
  });

  test("footer is present", async ({ page }) => {
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible();
  });

  test("KLAR logo is displayed", async ({ page }) => {
    const logo = page.locator("text=/KLAR/i").first();
    await expect(logo).toBeVisible();
  });
});

test.describe("Landing Page — German Locale", () => {
  test("loads in German locale", async ({ page }) => {
    await navigateTo(page, "", "de");
    const url = page.url();
    expect(url).toContain("/de");
  });

  test("displays German content", async ({ page }) => {
    await navigateTo(page, "", "de");
    // Should have some German text
    const body = await page.textContent("body");
    expect(body).toMatch(/verifizier|prüf|überprüf|ergebnis/i);
  });
});
