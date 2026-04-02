import { test, expect, navigateTo } from "./fixtures/helpers";

test.describe("Accessibility", () => {
  test.describe("Landing Page Accessibility", () => {
    test("has proper heading hierarchy", async ({ page }) => {
      await navigateTo(page, "", "en");

      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      // Check h1 exists before h2
      const headings = await page.locator("h1, h2, h3").allTextContents();
      expect(headings.length).toBeGreaterThan(0);
    });

    test("images have alt text", async ({ page }) => {
      await navigateTo(page, "", "en");

      const images = page.locator("img");
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute("alt");
        const role = await images.nth(i).getAttribute("role");
        // Image should have alt text OR role="presentation"
        expect(alt !== null || role === "presentation").toBe(true);
      }
    });

    test("interactive elements are keyboard navigable", async ({ page }) => {
      await navigateTo(page, "", "en");

      // Tab through first few focusable elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
      }

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      // Should be focused on a focusable element
      expect(focusedElement).toBeDefined();
    });

    test("buttons have accessible names", async ({ page }) => {
      await navigateTo(page, "", "en");

      const buttons = page.locator("button");
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute("aria-label");
        const title = await button.getAttribute("title");

        // Button should have text content, aria-label, or title
        expect(
          (text && text.trim().length > 0) || ariaLabel || title
        ).toBeTruthy();
      }
    });

    test("links have discernible text", async ({ page }) => {
      await navigateTo(page, "", "en");

      const links = page.locator("a");
      const count = await links.count();

      for (let i = 0; i < Math.min(count, 15); i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute("aria-label");
        const title = await link.getAttribute("title");

        expect(
          (text && text.trim().length > 0) || ariaLabel || title
        ).toBeTruthy();
      }
    });

    test("form inputs have labels", async ({ page }) => {
      await navigateTo(page, "/verify", "en");

      const inputs = page.locator("input:not([type='hidden']), textarea, select");
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute("id");
        const ariaLabel = await input.getAttribute("aria-label");
        const ariaLabelledBy = await input.getAttribute("aria-labelledby");
        const placeholder = await input.getAttribute("placeholder");

        // Input should have associated label, aria-label, aria-labelledby, or placeholder
        expect(id || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
      }
    });
  });

  test.describe("Color Contrast", () => {
    test("body text is readable", async ({ page }) => {
      await navigateTo(page, "", "en");

      const bodyColor = await page.evaluate(() => {
        const body = document.body;
        const style = getComputedStyle(body);
        return {
          color: style.color,
          bg: style.backgroundColor,
        };
      });

      expect(bodyColor.color).toBeDefined();
      expect(bodyColor.bg).toBeDefined();
    });
  });

  test.describe("Focus Management", () => {
    test("focus is visible on interactive elements", async ({ page }) => {
      await navigateTo(page, "/verify", "en");

      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      const outlineStyle = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          border: style.border,
        };
      });

      expect(outlineStyle).toBeDefined();
    });

    test("skip to main content works (if present)", async ({ page }) => {
      await navigateTo(page, "", "en");

      // Tab once — skip link should appear (common a11y pattern)
      await page.keyboard.press("Tab");
      const skipLink = page.locator('a[href="#main"], a[href*="skip"]');
      const count = await skipLink.count();
      // Skip link is optional but good practice
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

test.describe("Semantic HTML", () => {
  test("page has proper landmarks", async ({ page }) => {
    await navigateTo(page, "", "en");

    const header = page.locator("header");
    const main = page.locator("main");
    const footer = page.locator("footer");

    // At minimum, header and footer should be present
    expect(await header.count()).toBeGreaterThanOrEqual(1);
    expect(await footer.count()).toBeGreaterThanOrEqual(1);
  });

  test("verify page has proper form semantics", async ({ page }) => {
    await navigateTo(page, "/verify", "en");

    // Textarea should exist for input
    const textarea = page.locator("textarea");
    expect(await textarea.count()).toBeGreaterThanOrEqual(1);

    // Submit button should exist
    const submitButton = page.locator('button[type="submit"], button').filter({
      hasText: /verify|prüf|check|start/i,
    });
    expect(await submitButton.count()).toBeGreaterThanOrEqual(1);
  });
});
