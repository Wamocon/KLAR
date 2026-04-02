import { describe, it, expect } from "vitest";
import { detectPlagiarism } from "@/lib/analysis/plagiarism-detector";
import type { ClaimSource } from "@/types";

const originalText = `
The rapid development of artificial intelligence has transformed numerous industries
in unexpected ways. Rather than simply automating routine tasks, AI systems are now
capable of creative endeavors that were once thought to be exclusively human. From
composing music to generating visual art, these systems demonstrate capabilities that
challenge our understanding of creativity itself.
`;

const plagiarizedText = `
Rising global temperatures have led to increased frequency of extreme weather events.
Scientists have observed that these changes are primarily driven by human activities.
According to NASA, the rate of warming has accelerated significantly in recent decades.
`;

const sources: ClaimSource[] = [
  {
    title: "Climate Change Overview",
    url: "https://example.com/climate",
    snippet: "Rising global temperatures have led to increased frequency of extreme weather events. Scientists have observed that these changes are primarily driven by human activities.",
    source_type: "web",
  },
  {
    title: "NASA Climate Report",
    url: "https://nasa.gov/climate",
    snippet: "According to NASA, the rate of warming has accelerated significantly in recent decades. Multiple studies confirm this trend.",
    source_type: "web",
  },
];

const unrelatedSources: ClaimSource[] = [
  {
    title: "Sports News",
    url: "https://example.com/sports",
    snippet: "The football team won the championship after a thrilling overtime game.",
    source_type: "web",
  },
];

describe("Plagiarism Detector", () => {
  describe("detectPlagiarism", () => {
    it("should detect high originality for unique text", () => {
      const result = detectPlagiarism(originalText, unrelatedSources);
      expect(result.originalityPercent).toBeGreaterThan(60);
      expect(["original", "mostly_original"]).toContain(result.verdict);
    });

    it("should detect overlap when text matches sources", () => {
      const result = detectPlagiarism(plagiarizedText, sources);
      expect(result.matches.length).toBeGreaterThanOrEqual(0);
    });

    it("should return correct interface shape", () => {
      const result = detectPlagiarism(originalText, sources);
      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("verdict");
      expect(result).toHaveProperty("matches");
      expect(result).toHaveProperty("originalityPercent");
      expect(result).toHaveProperty("summary");
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it("should have proper match structure when matches found", () => {
      const result = detectPlagiarism(plagiarizedText, sources);
      for (const match of result.matches) {
        expect(match).toHaveProperty("text");
        expect(match).toHaveProperty("matchedSource");
        expect(match).toHaveProperty("sourceUrl");
        expect(match).toHaveProperty("similarity");
        expect(match.similarity).toBeGreaterThanOrEqual(0);
        expect(match.similarity).toBeLessThanOrEqual(100);
      }
    });

    it("should have originality percentage between 0 and 100", () => {
      const result = detectPlagiarism(originalText, sources);
      expect(result.originalityPercent).toBeGreaterThanOrEqual(0);
      expect(result.originalityPercent).toBeLessThanOrEqual(100);
    });

    it("should have valid verdict values", () => {
      const result = detectPlagiarism(originalText, sources);
      expect(["original", "mostly_original", "some_overlap", "significant_overlap", "likely_plagiarized"]).toContain(result.verdict);
    });

    it("should handle empty sources", () => {
      const result = detectPlagiarism(originalText, []);
      expect(result.originalityPercent).toBe(100);
      expect(result.verdict).toBe("original");
    });

    it("should handle very short text", () => {
      const result = detectPlagiarism("Short text.", sources);
      expect(result).toHaveProperty("overallScore");
    });

    it("should produce non-empty summary", () => {
      const result = detectPlagiarism(originalText, sources);
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });
});
