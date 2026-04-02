import { describe, it, expect } from "vitest";
import { detectHallucinations } from "@/lib/nlp/hallucination-detector";
import type { ClaimSource } from "@/types";

function makeSources(...snippets: string[]): ClaimSource[] {
  return snippets.map((snippet, i) => ({
    title: `Source ${i + 1}`,
    url: `https://example${i}.com/article`,
    snippet,
    source_type: "web" as const,
  }));
}

describe("Hallucination Detection Engine", () => {
  describe("detectHallucinations", () => {
    it("returns low risk for well-supported claims", () => {
      const claim = "Berlin is the capital of Germany.";
      const sources = makeSources(
        "Berlin is the capital and largest city of Germany by both area and population.",
        "Germany, officially the Federal Republic of Germany, is a country in Central Europe. The capital is Berlin."
      );

      const result = detectHallucinations(claim, sources);
      expect(result.riskLevel).toBe("low");
      expect(result.riskScore).toBeLessThan(0.3);
    });

    it("detects entity mismatches", () => {
      const claim = "Professor Hans Mueller at the University of Zurich discovered element 119 in 2024.";
      const sources = makeSources(
        "Recent chemistry research has focused on superheavy elements.",
        "No new elements have been confirmed beyond element 118."
      );

      const result = detectHallucinations(claim, sources);
      expect(result.signals.some((s) => s.type === "entity_mismatch" || s.type === "unsupported_specificity" || s.type === "low_evidence_overlap")).toBe(true);
    });

    it("detects number inconsistencies", () => {
      const claim = "The population of Berlin is 5.2 million people.";
      const sources = makeSources(
        "Berlin has a population of approximately 3.7 million inhabitants.",
      );

      const result = detectHallucinations(claim, sources);
      const numberSignal = result.signals.find((s) => s.type === "number_inconsistency");
      expect(numberSignal).toBeDefined();
    });

    it("detects date conflicts", () => {
      const claim = "The Berlin Wall fell in 1991.";
      const sources = makeSources(
        "The Berlin Wall fell on November 9, 1989, marking the end of the Cold War division."
      );

      const result = detectHallucinations(claim, sources);
      const dateSignal = result.signals.find((s) => s.type === "date_conflict");
      expect(dateSignal).toBeDefined();
      expect(dateSignal!.severity).toBe("high");
    });

    it("detects low evidence overlap", () => {
      const claim = "The quantum coherence of photosynthetic pigments achieves 97% efficiency.";
      const sources = makeSources(
        "Plants use sunlight for photosynthesis. Chlorophyll is the main pigment."
      );

      const result = detectHallucinations(claim, sources);
      const overlapSignal = result.signals.find((s) => s.type === "low_evidence_overlap");
      expect(overlapSignal).toBeDefined();
    });

    it("handles empty sources gracefully", () => {
      const claim = "Some factual claim about the world.";
      const result = detectHallucinations(claim, []);

      expect(result.riskLevel).toBeDefined();
      expect(result.signals).toBeDefined();
    });

    it("detects multiple signals for fabricated-looking content", () => {
      const claim = "According to a 2025 study by Dr. James Richardson at the MIT Institute of Technology, published in the Journal of Advanced Computing, the efficiency of quantum processors reached 99.7% in controlled lab settings, compared to 45.2% in 2020.";
      const sources = makeSources(
        "Quantum computing continues to advance with various research institutions contributing to the field."
      );

      const result = detectHallucinations(claim, sources);
      expect(result.signals.length).toBeGreaterThanOrEqual(2);
      expect(result.riskScore).toBeGreaterThan(0.2);
    });

    it("risk score is between 0 and 1", () => {
      const claim = "Test claim with numbers 42 and 100%.";
      const sources = makeSources("Evidence text about unrelated topics.");

      const result = detectHallucinations(claim, sources);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it("assigns correct risk levels", () => {
      // Low risk
      const lowResult = detectHallucinations("Berlin is in Germany.", makeSources("Berlin, Germany's capital city."));
      expect(["low", "medium"]).toContain(lowResult.riskLevel);

      // Should produce some signals for very specific unsupported claims
      const highResult = detectHallucinations(
        "Dr. Sandra Miller from Stanford University published in Nature that 78.3% of AI models fail in production in 2024.",
        makeSources("AI deployment challenges exist in enterprise settings.")
      );
      expect(highResult.signals.length).toBeGreaterThan(0);
    });
  });
});
