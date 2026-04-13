import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Gemini AI Module", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-api-key-123");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("TokenTracker", () => {
    it("tracks cumulative token usage", async () => {
      const { TokenTracker } = await import("@/lib/ai/gemini");
      const tracker = new TokenTracker();

      tracker.track({
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        },
      });

      tracker.track({
        usageMetadata: {
          promptTokenCount: 200,
          candidatesTokenCount: 100,
          totalTokenCount: 300,
        },
      });

      const session = tracker.getSession();
      expect(session.promptTokens).toBe(300);
      expect(session.completionTokens).toBe(150);
      expect(session.totalTokens).toBe(450);
    });

    it("returns last usage separately", async () => {
      const { TokenTracker } = await import("@/lib/ai/gemini");
      const tracker = new TokenTracker();

      tracker.track({
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      });
      tracker.track({
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10, totalTokenCount: 30 },
      });

      const last = tracker.getLast();
      expect(last.promptTokens).toBe(20);
      expect(last.completionTokens).toBe(10);
      expect(last.totalTokens).toBe(30);
    });

    it("handles missing metadata gracefully", async () => {
      const { TokenTracker } = await import("@/lib/ai/gemini");
      const tracker = new TokenTracker();

      tracker.track({});
      tracker.track({ usageMetadata: undefined });

      const session = tracker.getSession();
      expect(session.totalTokens).toBe(0);
    });

    it("resets to zero", async () => {
      const { TokenTracker } = await import("@/lib/ai/gemini");
      const tracker = new TokenTracker();

      tracker.track({
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
      });
      tracker.reset();

      const session = tracker.getSession();
      expect(session.totalTokens).toBe(0);
    });
  });

  describe("estimateTokens", () => {
    it("estimates ~4 chars per token", async () => {
      const { estimateTokens } = await import("@/lib/ai/gemini");
      expect(estimateTokens("Hello world")).toBe(3); // 11 chars ~= 3 tokens
      expect(estimateTokens("")).toBe(0);
      expect(estimateTokens("A".repeat(400))).toBe(100);
    });
  });

  describe("extractClaims", () => {
    it("calls Gemini REST API with thinkingBudget: 0", async () => {
      const mockResponse = [
        {
          claim_text: "The temperature has risen by 1.1°C",
          original_sentence: "The temperature has risen by 1.1°C since pre-industrial times.",
          position_start: 0,
          position_end: 62,
        },
      ];

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(mockResponse) }] } }],
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { extractClaims, TokenTracker } = await import("@/lib/ai/gemini");
      const tracker = new TokenTracker();
      const claims = await extractClaims("The temperature has risen by 1.1°C since pre-industrial times.", "en", tracker);

      expect(claims).toHaveLength(1);
      expect(claims[0].claim_text).toContain("1.1°C");

      // Verify REST API call includes thinkingBudget: 0
      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain("generativelanguage.googleapis.com");
      expect(url).toContain("generateContent");
      const body = JSON.parse((options as RequestInit).body as string);
      expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);

      // Verify token tracking
      expect(tracker.getSession().totalTokens).toBe(150);
    });

    it("respects maxClaims option", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "[]" }] } }],
            usageMetadata: {},
          }),
          { status: 200 }
        )
      );

      const { extractClaims } = await import("@/lib/ai/gemini");
      await extractClaims("Test text content that is long enough", "en", undefined, { maxClaims: 5 });

      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.contents[0].parts[0].text).toContain("UP TO 5 claims");
    });

    it("handles German language instruction", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "[]" }] } }],
            usageMetadata: {},
          }),
          { status: 200 }
        )
      );

      const { extractClaims } = await import("@/lib/ai/gemini");
      await extractClaims("Der Test ist auf Deutsch geschrieben.", "de");

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
      expect(body.contents[0].parts[0].text).toContain("German");
    });

    it("truncates text to 10K characters", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "[]" }] } }],
            usageMetadata: {},
          }),
          { status: 200 }
        )
      );

      const { extractClaims } = await import("@/lib/ai/gemini");
      const longText = "A".repeat(20000);
      await extractClaims(longText, "en");

      const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
      // The prompt should contain the truncated text (10K), not the full 20K
      expect(body.contents[0].parts[0].text.length).toBeLessThan(15000);
    });

    it("throws on API error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "Quota exceeded" } }),
          { status: 429 }
        )
      );

      const { extractClaims } = await import("@/lib/ai/gemini");
      await expect(extractClaims("Test text that is long enough to process", "en")).rejects.toThrow("Gemini API error");
    });

    it("throws on empty response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ candidates: [] }),
          { status: 200 }
        )
      );

      const { extractClaims } = await import("@/lib/ai/gemini");
      await expect(extractClaims("Test text that is long enough to process", "en")).rejects.toThrow("Empty response");
    });

    it("filters out claims with empty text", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify([
                    { claim_text: "Valid claim", original_sentence: "Valid claim here.", position_start: 0, position_end: 17 },
                    { claim_text: "", original_sentence: "", position_start: 0, position_end: 0 },
                    { claim_text: "  ", original_sentence: "", position_start: 0, position_end: 0 },
                  ]),
                }],
              },
            }],
            usageMetadata: {},
          }),
          { status: 200 }
        )
      );

      const { extractClaims } = await import("@/lib/ai/gemini");
      const claims = await extractClaims("Valid claim here. And some other text for length.", "en");
      expect(claims).toHaveLength(1);
      expect(claims[0].claim_text).toBe("Valid claim");
    });
  });
});
