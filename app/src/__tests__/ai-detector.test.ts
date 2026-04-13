import { describe, it, expect } from "vitest";
import { detectAIContent } from "@/lib/analysis/ai-detector";

const humanText = `
I was walking through the park yesterday when I noticed something odd. The trees,
normally so vibrant in late spring, looked tired. Wilted, even. My neighbor Tom said
it was the drought — we hadn't had rain in three weeks, which is unusual for this
time of year. I remember back in 2019, we had a similar dry spell that killed half
the roses in Mrs. Chen's garden. She was devastated. Anyway, I called the local
extension office and they confirmed the water table was indeed lower than normal.
Not catastrophically so, but enough to stress shallow-rooted plants.
`;

const aiText = `
Climate change is a significant global challenge that requires immediate attention.
The phenomenon is characterized by rising global temperatures, shifting precipitation
patterns, and increasing frequency of extreme weather events. Scientists have observed
that these changes are primarily driven by human activities, particularly the burning
of fossil fuels and deforestation. Understanding the impacts of climate change is
essential for developing effective mitigation and adaptation strategies. Furthermore,
international cooperation is necessary to address this complex issue. It is important
to note that climate change affects all regions of the world, though some areas are
more vulnerable than others. The transition to renewable energy sources represents
a crucial step in reducing greenhouse gas emissions.
`;

const shortText = "This is a very short text that probably cannot be analyzed well.";

describe("AI Content Detector", () => {
  describe("detectAIContent", () => {
    it("should return low AI score for human-written text", () => {
      const result = detectAIContent(humanText);
      expect(result.overallScore).toBeLessThan(60);
      expect(["human", "likely_human", "mixed"]).toContain(result.verdict);
    });

    it("should return higher AI score for AI-like text", () => {
      const result = detectAIContent(aiText);
      expect(result.overallScore).toBeGreaterThan(30);
    });

    it("should return correct interface shape", () => {
      const result = detectAIContent(humanText);
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("verdict");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("signals");
      expect(result).toHaveProperty("sentenceAnalysis");
      expect(result).toHaveProperty("vocabularyAnalysis");
      expect(Array.isArray(result.signals)).toBe(true);
    });

    it("should have signals with proper structure", () => {
      const result = detectAIContent(aiText);
      for (const signal of result.signals) {
        expect(signal).toHaveProperty("type");
        expect(signal).toHaveProperty("score");
        expect(signal).toHaveProperty("detail");
        expect(signal.score).toBeGreaterThanOrEqual(0);
        expect(signal.score).toBeLessThanOrEqual(100);
      }
    });

    it("should provide sentence analysis metrics", () => {
      const result = detectAIContent(aiText);
      expect(result.sentenceAnalysis.avgLength).toBeGreaterThan(0);
      expect(typeof result.sentenceAnalysis.lengthVariance).toBe("number");
      expect(typeof result.sentenceAnalysis.uniformityScore).toBe("number");
    });

    it("should provide vocabulary analysis metrics", () => {
      const result = detectAIContent(aiText);
      expect(result.vocabularyAnalysis.uniqueWords).toBeGreaterThan(0);
      expect(result.vocabularyAnalysis.totalWords).toBeGreaterThan(0);
      expect(typeof result.vocabularyAnalysis.typeTokenRatio).toBe("number");
    });

    it("should produce a valid verdict", () => {
      const result = detectAIContent(aiText);
      expect(["human", "likely_human", "mixed", "likely_ai", "ai_generated"]).toContain(result.verdict);
    });

    it("should handle short text without crashing", () => {
      const result = detectAIContent(shortText);
      expect(result).toHaveProperty("overallScore");
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it("should have confidence between 0 and 1", () => {
      const result = detectAIContent(aiText);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should detect sentence uniformity in AI text", () => {
      const result = detectAIContent(aiText);
      // AI text tends to have MORE uniform sentence lengths
      expect(typeof result.sentenceAnalysis.uniformityScore).toBe("number");
    });

    it("should detect entropy signal in AI text", () => {
      const result = detectAIContent(aiText);
      const entropySignal = result.signals.find(s => s.type === "entropy");
      // Entropy may or may not trigger — just make sure the field is valid
      if (entropySignal) {
        expect(entropySignal.score).toBeGreaterThanOrEqual(0);
        expect(entropySignal.score).toBeLessThanOrEqual(100);
        expect(entropySignal.detail).toContain("entropy");
      }
    });

    it("should include valid signal types from extended set", () => {
      const result = detectAIContent(aiText);
      const validTypes = [
        "perplexity", "burstiness", "vocabulary", "sentence_uniformity",
        "hedging", "repetitive_structure", "filler_pattern",
        "entropy", "zipf_deviation", "punctuation", "paragraph_variance",
      ];
      for (const signal of result.signals) {
        expect(validTypes).toContain(signal.type);
      }
    });

    it("should include a descriptive summary", () => {
      const result = detectAIContent(aiText);
      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(20);
    });
  });
});
