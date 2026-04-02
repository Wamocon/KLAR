import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "@/lib/ai/embeddings";

describe("Embeddings - Cosine Similarity", () => {
  it("returns 1 for identical vectors", () => {
    const vec = [1, 0, 0, 1];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns -1 for opposite vectors", () => {
    const a = [1, 0];
    const b = [-1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it("computes correct similarity for known vectors", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    // cos(a,b) = (4+10+18) / (sqrt(14) * sqrt(77)) = 32 / 32.8329... ≈ 0.9746
    const result = cosineSimilarity(a, b);
    expect(result).toBeGreaterThan(0.97);
    expect(result).toBeLessThan(0.98);
  });

  it("handles negative values", () => {
    const a = [1, -1, 0];
    const b = [-1, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
  });
});
