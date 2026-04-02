import { describe, it, expect } from "vitest";
import { analyzeClaimQuality, filterHighQualityClaims } from "@/lib/nlp/claim-quality";
import type { ExtractedClaim } from "@/types";

function makeClaim(text: string): ExtractedClaim {
  return {
    claim_text: text,
    original_sentence: text,
    position_start: 0,
    position_end: text.length,
  };
}

describe("NLP Claim Quality Scoring", () => {
  describe("analyzeClaimQuality", () => {
    it("scores a highly specific factual claim well", () => {
      const claim = makeClaim("Germany had a GDP of $4.2 trillion in 2023, making it the fourth-largest economy in the world.");
      const score = analyzeClaimQuality(claim);

      expect(score.overall).toBeGreaterThan(0.5);
      expect(score.specificity).toBeGreaterThan(0.3);
      expect(score.verifiability).toBeGreaterThan(0.5);
      expect(score.objectivity).toBeGreaterThan(0.5);
    });

    it("scores a vague opinion poorly", () => {
      const claim = makeClaim("I think this is probably the best approach.");
      const score = analyzeClaimQuality(claim);

      expect(score.objectivity).toBeLessThan(0.7);
      expect(score.flags).toContain("opinion_detected");
    });

    it("detects compound claims", () => {
      const claim = makeClaim("The Earth is round and the moon orbits the Earth and the sun is a star while Mars has two moons.");
      const score = analyzeClaimQuality(claim);

      expect(score.atomicity).toBeLessThan(0.6);
      expect(score.flags).toContain("compound_claim");
    });

    it("flags questions as hard to verify", () => {
      const claim = makeClaim("Did Einstein really invent the theory of relativity?");
      const score = analyzeClaimQuality(claim);

      expect(score.verifiability).toBeLessThan(0.3);
      expect(score.flags).toContain("hard_to_verify");
    });

    it("flags too-short claims", () => {
      const claim = makeClaim("It is true.");
      const score = analyzeClaimQuality(claim);

      expect(score.flags).toContain("too_short");
      expect(score.specificity).toBeLessThan(0.3);
    });

    it("marks entity-rich claims", () => {
      const claim = makeClaim("The United Nations headquarters is located in New York City in the United States of America.");
      const score = analyzeClaimQuality(claim);

      expect(score.entityDensity).toBeGreaterThan(0.3);
    });

    it("detects future predictions as less verifiable", () => {
      const claim = makeClaim("Tesla will produce 20 million cars by 2030.");
      const score = analyzeClaimQuality(claim);

      expect(score.verifiability).toBeLessThan(0.5);
    });

    it("scores a good factual claim with named entities well", () => {
      const claim = makeClaim("Albert Einstein was born in Ulm, Germany on March 14, 1879.");
      const score = analyzeClaimQuality(claim);

      expect(score.specificity).toBeGreaterThan(0.3);
      expect(score.verifiability).toBeGreaterThan(0.5);
      expect(score.objectivity).toBeGreaterThanOrEqual(0.7);
    });

    it("returns all score dimensions between 0 and 1", () => {
      const claim = makeClaim("The population of Tokyo is approximately 14 million people.");
      const score = analyzeClaimQuality(claim);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(1);
      expect(score.specificity).toBeGreaterThanOrEqual(0);
      expect(score.specificity).toBeLessThanOrEqual(1);
      expect(score.atomicity).toBeGreaterThanOrEqual(0);
      expect(score.atomicity).toBeLessThanOrEqual(1);
      expect(score.objectivity).toBeGreaterThanOrEqual(0);
      expect(score.objectivity).toBeLessThanOrEqual(1);
      expect(score.verifiability).toBeGreaterThanOrEqual(0);
      expect(score.verifiability).toBeLessThanOrEqual(1);
      expect(score.entityDensity).toBeGreaterThanOrEqual(0);
      expect(score.entityDensity).toBeLessThanOrEqual(1);
    });
  });

  describe("filterHighQualityClaims", () => {
    it("filters out low-quality claims", () => {
      const claims: ExtractedClaim[] = [
        makeClaim("Albert Einstein was born in Ulm, Germany on March 14, 1879."),
        makeClaim("Things are interesting."),
        makeClaim("Maybe."),
      ];

      const filtered = filterHighQualityClaims(claims, 0.3);
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered[0].claim.claim_text).toContain("Einstein");
    });

    it("returns all claims when threshold is 0", () => {
      const claims: ExtractedClaim[] = [
        makeClaim("Claim one."),
        makeClaim("Claim two."),
      ];

      const filtered = filterHighQualityClaims(claims, 0);
      expect(filtered.length).toBe(2);
    });
  });
});
