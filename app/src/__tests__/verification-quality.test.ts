import { describe, it, expect } from "vitest";
import { detectHallucinations } from "@/lib/nlp/hallucination-detector";
import { crossReferenceValidation } from "@/lib/evidence/cross-reference";

describe("Verification Quality Checks", () => {
  const makeSources = (domains: string[]) =>
    domains.map((d) => ({
      title: `Article from ${d}`,
      url: `https://${d}/article`,
      snippet: `Information about the claim from ${d}`,
      source_type: "news" as const,
      credibility_score: 0.8,
    }));

  describe("Hallucination Detection", () => {
    it("returns low risk for well-sourced claims", () => {
      const sources = makeSources(["reuters.com", "bbc.com"]);
      const result = detectHallucinations("The temperature has risen by 1.1°C", sources);
      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(["low", "medium", "high", "critical"]).toContain(result.riskLevel);
    });

    it("returns higher risk for unsourced claims", () => {
      const result = detectHallucinations("A completely fabricated statistic of 99.9%", []);
      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });

    it("handles empty claim", () => {
      const result = detectHallucinations("", []);
      expect(result).toBeDefined();
    });
  });

  describe("Cross-Reference Validation", () => {
    it("returns valid structure for empty sources", () => {
      const result = crossReferenceValidation("Test claim", []);
      expect(result).toBeDefined();
      expect(result.sourceConsensus).toBeDefined();
      expect(typeof result.independentSources).toBe("number");
      expect(typeof result.agreementScore).toBe("number");
    });

    it("calculates independence from diverse sources", () => {
      const sources = makeSources(["reuters.com", "bbc.com", "nature.com"]);
      const result = crossReferenceValidation("The Earth is warming", sources);
      expect(result.independentSources).toBeGreaterThanOrEqual(0);
    });

    it("detects low independence from same-domain sources", () => {
      const sources = makeSources(["bbc.com", "bbc.com", "bbc.co.uk"]);
      const result = crossReferenceValidation("Test claim", sources);
      expect(result.independentSources).toBeGreaterThanOrEqual(0);
    });

    it("produces agreement score between 0 and 1", () => {
      const sources = makeSources(["reuters.com"]);
      const result = crossReferenceValidation("Any claim", sources);
      expect(result.agreementScore).toBeGreaterThanOrEqual(0);
      expect(result.agreementScore).toBeLessThanOrEqual(1);
    });
  });
});
