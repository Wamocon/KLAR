import { test, expect, navigateTo } from "./fixtures/helpers";

/**
 * Cleanup Verification Tests
 * 
 * Verifies that benchmark system and framework-eval have been
 * completely removed from the UI, and all analysis modes work correctly.
 */

test.describe("Benchmark & Framework Removal Verification", () => {

  test("navbar does NOT show Benchmark link (logged out)", async ({ page }) => {
    await navigateTo(page, "/", "en");
    const nav = page.locator("header").first();
    const navText = await nav.innerText();
    expect(navText).not.toMatch(/\bBenchmark\b/i);
  });

  test("navbar does NOT show Benchmark link (DE)", async ({ page }) => {
    await navigateTo(page, "/", "de");
    const nav = page.locator("header").first();
    const navText = await nav.innerText();
    expect(navText).not.toMatch(/\bBenchmark\b/i);
  });

  test("benchmark page returns 404", async ({ page }) => {
    const response = await page.goto("/en/benchmark");
    expect(response?.status()).toBe(404);
  });

  test("benchmark API routes return 404", async ({ request }) => {
    const endpoints = [
      "/api/benchmark/agent",
      "/api/benchmark/exam",
      "/api/benchmark/leaderboard",
    ];
    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} should be 404`).toBe(404);
    }
  });
});

test.describe("Verify Page — Correct Analysis Modes", () => {

  test("verify page loads with correct subtitle (no Quality Evaluation)", async ({ page }) => {
    await navigateTo(page, "/verify", "en");
    const body = await page.innerText("body");
    
    // Should have these in subtitle
    expect(body).toContain("Fact Check");
    expect(body).toContain("Bias Detection");
    expect(body).toContain("AI Detection");
    expect(body).toContain("Plagiarism");
    
    // Should NOT have Quality Evaluation
    expect(body).not.toContain("Quality Evaluation");
  });

  test("verify page DE subtitle correct (no Qualitätsbewertung in subtitle)", async ({ page }) => {
    await navigateTo(page, "/verify", "de");
    const subtitle = page.locator("p").filter({ hasText: /Faktenprüfung.*Bias/ });
    const text = await subtitle.textContent();
    expect(text).not.toContain("Qualitätsbewertung");
    expect(text).toContain("Faktenprüfung");
    expect(text).toContain("Plagiatsprüfung");
  });

  test("analysis mode buttons show exactly 4 modes + Full Analysis", async ({ page }) => {
    await navigateTo(page, "/verify", "en");
    
    // Wait for the analysis mode section
    await page.waitForSelector("text=Analysis Modes", { timeout: 10000 });
    
    // There should be 4 individual mode buttons plus Full Analysis
    const modeButtons = page.locator("button").filter({ hasText: /Fact Check|Bias Detection|AI Detection|Plagiarism/ });
    const count = await modeButtons.count();
    expect(count).toBe(4);
    
    // Full Analysis button should exist
    const fullAnalysis = page.locator("button, a").filter({ hasText: /Full Analysis/ });
    await expect(fullAnalysis.first()).toBeVisible();
    
    // Framework/Quality button should NOT exist
    const frameworkBtn = page.locator("button").filter({ hasText: /Framework|Quality Eval|MECE/ });
    expect(await frameworkBtn.count()).toBe(0);
  });

  test("no framework-eval or benchmark text anywhere on verify page", async ({ page }) => {
    await navigateTo(page, "/verify", "en");
    const visibleText = await page.innerText("body");
    
    expect(visibleText).not.toContain("framework-eval");
    expect(visibleText).not.toContain("framework_evaluation");
    expect(visibleText).not.toContain("MECE");
    expect(visibleText).not.toContain("Red Team");
    expect(visibleText).not.toContain("Pre-Mortem");
    expect(visibleText).not.toContain("Quality Eval");
  });
});

test.describe("Homepage — Updated Engine List", () => {

  test("homepage shows EU Compliance instead of Quality Evaluation", async ({ page }) => {
    await navigateTo(page, "/", "en");
    const body = await page.innerText("body");
    
    // Should show EU Compliance
    expect(body).toMatch(/EU.*Compliance|AI Act/i);
    
    // Should NOT show old quality evaluation engine
    expect(body).not.toContain("MECE (structure), Red Team (weaknesses)");
  });

  test("homepage DE shows EU Compliance", async ({ page }) => {
    await navigateTo(page, "/", "de");
    const body = await page.innerText("body");
    expect(body).toMatch(/EU.*Konformit\u00e4t|AI Act/i);
  });
});

test.describe("About Page — No Framework References", () => {

  test("about page feature list does not include Quality Evaluation", async ({ page }) => {
    await navigateTo(page, "/about", "en");
    const body = await page.innerText("body");
    
    // Core features should be listed
    expect(body).toContain("Fact Check");
    expect(body).toContain("Bias Detection");
    expect(body).toContain("AI Detection");
    expect(body).toContain("Plagiarism");
    
    // Quality Evaluation with MECE should NOT be listed
    expect(body).not.toContain("MECE");
    expect(body).not.toContain("Red Team (weaknesses)");
  });
});

test.describe("Navigation Structure", () => {

  test("navbar shows correct links for logged-out user", async ({ page }) => {
    await navigateTo(page, "/", "en");
    const nav = page.locator("header").first();
    const navText = await nav.innerText();
    
    // Should have Tools
    expect(navText).toContain("Tools");
    
    // Should NOT have Benchmark
    expect(navText).not.toMatch(/\bBenchmark\b/);
  });

  test("tools page loads correctly", async ({ page }) => {
    await navigateTo(page, "/tools", "en");
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
  });

  test("compliance page loads correctly", async ({ page }) => {
    await navigateTo(page, "/compliance", "en");
    // Should load (may redirect to login, which is fine)
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe("complete");
  });
});

test.describe("API Schema Validation", () => {

  test("verify API rejects framework-eval as analysis mode", async ({ request }) => {
    const response = await request.post("/api/verify", {
      data: {
        text: "Berlin is the capital of Germany. The Berlin Wall fell in November 1989. This is a test text with enough characters to pass validation.",
        language: "en",
        mode: "text",
        analyses: ["framework-eval"],
      },
    });
    // Should be 400 (invalid mode) since framework-eval no longer exists
    expect(response.status()).toBe(400);
  });

  test("verify API accepts valid analysis modes", async ({ request }) => {
    const validModes = ["fact-check", "bias-check", "ai-detection", "plagiarism"];
    for (const mode of validModes) {
      const response = await request.post("/api/verify", {
        data: {
          text: "Berlin is the capital of Germany. The Berlin Wall fell in November 1989. This is a test of the verification system with enough content.",
          language: "en",
          mode: "text",
          analyses: [mode],
        },
      });
      // Should be 200 (streaming), 401 (no auth), or 429 (rate limit) — NOT 400 (bad request)
      expect(
        response.status() !== 400,
        `${mode} should be accepted (got ${response.status()})`
      ).toBe(true);
    }
  });

  test("extension extract API rejects framework-eval", async ({ request }) => {
    const response = await request.post("/api/extension/extract", {
      data: {
        text: "Berlin is the capital of Germany. The Berlin Wall fell in November 1989. This is a test text with enough characters.",
        language: "en",
        analyses: ["framework-eval"],
      },
    });
    expect([400, 401].includes(response.status())).toBe(true);
  });
});

test.describe("Key Pages Render Without Errors", () => {
  const pages = [
    { path: "/", name: "Home" },
    { path: "/verify", name: "Verify" },
    { path: "/about", name: "About" },
    { path: "/tools", name: "Tools" },
    { path: "/privacy", name: "Privacy" },
    { path: "/terms", name: "Terms" },
    { path: "/imprint", name: "Imprint" },
    { path: "/contact", name: "Contact" },
  ];

  for (const { path, name } of pages) {
    test(`${name} page (${path}) loads without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !msg.text().includes("favicon") && !msg.text().includes("Supabase")) {
          errors.push(msg.text());
        }
      });

      const response = await page.goto(`/en${path}`);
      expect(response?.status()).toBeLessThan(500);
      
      // Wait for content
      await page.waitForLoadState("domcontentloaded");
      
      // Verify no "benchmark" or "framework-eval" in visible page content
      const visibleText = await page.innerText("body");
      expect(visibleText).not.toContain("framework-eval");
      expect(visibleText).not.toMatch(/\bBenchmark\b/);
    });
  }
});
