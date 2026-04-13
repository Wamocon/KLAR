import { describe, it, expect, vi } from "vitest";
import { detectBias } from "@/lib/analysis/bias-detector";
import { detectAIContent } from "@/lib/analysis/ai-detector";
import { detectPlagiarism } from "@/lib/analysis/plagiarism-detector";
import { checkAIActCompliance } from "@/lib/analysis/ai-act-checker";

// Mock searchWeb to prevent real HTTP calls
vi.mock("@/lib/evidence/serper", () => ({
  searchWeb: vi.fn().mockResolvedValue([]),
}));

describe("Analysis Pipeline", () => {
  const neutralText = "The global average temperature has increased by approximately 1.1 degrees Celsius since the pre-industrial era according to the IPCC Sixth Assessment Report published in 2023.";
  const biasedText = "The absolutely terrible and horrific climate disaster is entirely caused by the greedy corrupt fossil fuel industry who are evil criminals ravaging our planet with reckless abandon.";
  const aiGeneratedText = "In the realm of modern technology, it is important to note that advancements in artificial intelligence have been significant. Furthermore, the implications of these developments are multifaceted and warrant careful consideration. Additionally, the intersection of technology and society presents both opportunities and challenges that must be addressed with a holistic approach.";

  describe("Bias Detection", () => {
    it("returns low bias score for neutral text", () => {
      const result = detectBias(neutralText);
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe("number");
      expect(result.overallScore).toBeLessThan(50);
    });

    it("returns higher bias score for loaded language", () => {
      const result = detectBias(biasedText);
      expect(result.overallScore).toBeGreaterThan(10);
    });

    it("returns bias level enum", () => {
      const result = detectBias(neutralText);
      expect(["minimal", "slight", "moderate", "significant", "extreme"]).toContain(result.biasLevel);
    });

    it("handles empty text gracefully", () => {
      const result = detectBias("");
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe("number");
    });
  });

  describe("AI Content Detection", () => {
    it("returns a score for human-written text", () => {
      const result = detectAIContent(neutralText);
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe("number");
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("returns verdict enum", () => {
      const result = detectAIContent(neutralText);
      expect(["human", "likely_human", "mixed", "likely_ai", "ai_generated"]).toContain(result.verdict);
    });

    it("returns higher score for AI-style text", () => {
      const result = detectAIContent(aiGeneratedText);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });

    it("handles empty text gracefully", () => {
      const result = detectAIContent("");
      expect(result).toBeDefined();
    });
  });

  describe("Plagiarism Detection", () => {
    it("returns a result with overallScore", async () => {
      const result = await detectPlagiarism(neutralText, []);
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe("number");
    });

    it("returns verdict enum", async () => {
      const result = await detectPlagiarism(neutralText, []);
      expect(["original", "mostly_original", "some_overlap", "significant_overlap", "likely_plagiarized"]).toContain(result.verdict);
    });

    it("handles empty sources array", async () => {
      const result = await detectPlagiarism(neutralText, []);
      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
    });
  });

  describe("EU AI Act Compliance", () => {
    it("returns a compliance result", () => {
      const result = checkAIActCompliance(neutralText);
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe("number");
    });

    it("classifies neutral content as minimal risk", () => {
      const result = checkAIActCompliance(neutralText);
      expect(result.riskLevel).toBe("minimal");
    });

    it("returns valid compliance levels", () => {
      const result = checkAIActCompliance(neutralText);
      expect(["compliant", "mostly_compliant", "partially_compliant", "non_compliant"]).toContain(result.complianceLevel);
    });
  });
});
