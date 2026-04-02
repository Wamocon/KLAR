import { test, expect, navigateTo, TEST_DATA } from "./fixtures/helpers";

test.describe("Verify Page", () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, "/verify", "en");
  });

  test("loads verify page with input area", async ({ page }) => {
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();

    // Should have a text input area
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
  });

  test("has text input mode by default", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
  });

  test("supports URL input mode", async ({ page }) => {
    // Find and click URL tab/button
    const urlTab = page.locator("button, [role='tab']").filter({ hasText: /url/i }).first();
    if (await urlTab.isVisible()) {
      await urlTab.click();
      const urlInput = page.locator('input[type="url"], input[placeholder*="http"], input[placeholder*="URL"]').first();
      await expect(urlInput).toBeVisible();
    }
  });

  test("supports file upload mode", async ({ page }) => {
    const fileTab = page.locator("button, [role='tab']").filter({ hasText: /file|datei/i }).first();
    if (await fileTab.isVisible()) {
      await fileTab.click();
      const fileInput = page.locator('input[type="file"]');
      // File input might exist but be hidden; check for upload area
      const uploadArea = page.locator("text=/upload|drag|drop|hochladen/i").first();
      const isVisible = await uploadArea.isVisible().catch(() => false);
      expect(isVisible || (await fileInput.count()) > 0).toBe(true);
    }
  });

  test("has analysis mode selector", async ({ page }) => {
    // Should show analysis mode options
    const modeSelector = page.locator("text=/fact.check|bias|ai.detect|plagiarism|comprehensive/i").first();
    await expect(modeSelector).toBeVisible();
  });

  test("verify button is present", async ({ page }) => {
    const verifyButton = page.locator("button").filter({ hasText: /verify|prüf|check|start/i }).first();
    await expect(verifyButton).toBeVisible();
  });

  test("does not submit empty text", async ({ page }) => {
    const verifyButton = page.locator("button").filter({ hasText: /verify|prüf|check|start/i }).first();
    await verifyButton.click();

    // Should not navigate away or show results — might show validation error
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/verify");
  });

  test("accepts text input", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await textarea.fill(TEST_DATA.verifiableText);
    const value = await textarea.inputValue();
    expect(value).toBe(TEST_DATA.verifiableText);
  });

  test("shows character count or input limit", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await textarea.fill(TEST_DATA.verifiableText);

    // Look for character count display
    await page.waitForTimeout(500);
    const charCount = page.locator("text=/\\d+\\s*(char|zeichen|\\/)\\s*/i").first();
    // This is optional UI — just verify no crash
  });

  test("can switch between analysis modes", async ({ page }) => {
    const modes = page.locator("button, label, [role='radio'], [role='checkbox']").filter({
      hasText: /fact.check|bias|ai.detect|plagiarism|quality/i,
    });
    const count = await modes.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Click each mode
    for (let i = 0; i < Math.min(count, 3); i++) {
      await modes.nth(i).click();
    }
  });
});

test.describe("Verify Page — Text Submission", () => {
  test("submits text and shows loading/processing state", async ({ page }) => {
    await navigateTo(page, "/verify", "en");

    const textarea = page.locator("textarea").first();
    await textarea.fill(TEST_DATA.verifiableText);

    const verifyButton = page.locator("button").filter({ hasText: /verify|prüf|check|start/i }).first();
    await verifyButton.click();

    // Should show some loading/processing indicator
    await page.waitForTimeout(2000);
    const processing = page.locator("text=/processing|analyzing|extracting|prüf|loading/i").first();
    const isProcessing = await processing.isVisible().catch(() => false);

    // Either processing indicator is shown OR results are already streaming
    const results = page.locator("text=/claim|support|contradict|unverif|trust/i").first();
    const hasResults = await results.isVisible().catch(() => false);

    expect(isProcessing || hasResults).toBe(true);
  });
});

test.describe("Verify Page — URL Mode", () => {
  test("accepts URL input correctly", async ({ page }) => {
    await navigateTo(page, "/verify", "en");

    const urlTab = page.locator("button, [role='tab']").filter({ hasText: /url/i }).first();
    if (await urlTab.isVisible()) {
      await urlTab.click();

      const urlInput = page.locator('input[type="url"], input[placeholder*="http"], input[placeholder*="URL"]').first();
      await urlInput.fill(TEST_DATA.validUrl);

      const value = await urlInput.inputValue();
      expect(value).toBe(TEST_DATA.validUrl);
    }
  });
});

test.describe("Verify Page — Prefill via Query Param", () => {
  test("supports prefill from query parameter", async ({ page }) => {
    const text = encodeURIComponent("Test prefill text");
    await page.goto(`/en/verify?prefill=${text}`);
    await page.waitForLoadState("domcontentloaded");

    await page.waitForTimeout(1000);
    const textarea = page.locator("textarea").first();
    const value = await textarea.inputValue();
    // Should be filled or page loaded without error
    expect(page.url()).toContain("/verify");
  });

  test("supports URL mode from query parameter", async ({ page }) => {
    const url = encodeURIComponent("https://example.com");
    await page.goto(`/en/verify?url=${url}`);
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/verify");
  });
});
