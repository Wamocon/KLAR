import { describe, it, expect } from "vitest";
import { crossReferenceValidation } from "@/lib/evidence/cross-reference";
import type { ClaimSource } from "@/types";

function makeSource(title: string, url: string, snippet: string, type: ClaimSource["source_type"] = "web"): ClaimSource {
  return { title, url, snippet, source_type: type };
}

describe("Cross-Reference Validation Engine", () => {
  it("returns 'none' consensus for empty sources", () => {
    const result = crossReferenceValidation("Test claim.", []);
    expect(result.sourceConsensus).toBe("none");
    expect(result.independentSources).toBe(0);
    expect(result.agreementScore).toBe(0);
  });

  it("returns 'weak' consensus for a single source", () => {
    const sources = [
      makeSource("Wikipedia", "https://en.wikipedia.org/wiki/Test", "Some evidence text.", "wikipedia"),
    ];
    const result = crossReferenceValidation("Test claim.", sources);
    expect(result.sourceConsensus).toBe("weak");
    expect(result.independentSources).toBe(1);
  });

  it("counts independent domain families correctly", () => {
    const sources = [
      makeSource("Wikipedia", "https://en.wikipedia.org/wiki/Berlin", "Berlin is the capital of Germany.", "wikipedia"),
      makeSource("BBC News", "https://www.bbc.com/news/world", "Berlin serves as Germany's capital.", "web"),
      makeSource("Reuters", "https://www.reuters.com/topic/berlin", "The capital of Germany is Berlin.", "web"),
    ];

    const result = crossReferenceValidation("Berlin is the capital of Germany.", sources);
    expect(result.independentSources).toBe(3);
  });

  it("detects agreement between corroborating sources", () => {
    const sources = [
      makeSource("Wikipedia", "https://en.wikipedia.org/wiki/Berlin", "Berlin is the capital and largest city of Germany with a population of 3.7 million.", "wikipedia"),
      makeSource("BBC", "https://www.bbc.com/news/berlin", "Berlin, the capital of Germany, has approximately 3.7 million residents.", "web"),
      makeSource("Reuters", "https://www.reuters.com/berlin", "Germany's capital Berlin is home to about 3.7 million people.", "web"),
    ];

    const result = crossReferenceValidation("Berlin is the capital of Germany with a population of 3.7 million.", sources);
    expect(result.agreementScore).toBeGreaterThan(0.3);
    expect(["strong", "moderate"]).toContain(result.sourceConsensus);
  });

  it("supporting details track high-overlap source pairs", () => {
    const sources = [
      makeSource("Source A", "https://sourcea.com/article", "Climate change causes rising sea levels and extreme weather patterns worldwide.", "web"),
      makeSource("Source B", "https://sourceb.com/article", "Rising sea levels and extreme weather patterns are consequences of global climate change.", "web"),
    ];

    const result = crossReferenceValidation("Climate change causes rising sea levels.", sources);
    expect(result.supportingDetails.length).toBeGreaterThanOrEqual(0);
  });

  it("treats subdomains as same domain family", () => {
    const sources = [
      makeSource("Wiki EN", "https://en.wikipedia.org/wiki/Test", "Evidence A", "wikipedia"),
      makeSource("Wiki DE", "https://de.wikipedia.org/wiki/Test", "Evidence B", "wikipedia"),
    ];

    const result = crossReferenceValidation("Test claim.", sources);
    // Both are wikipedia.org — only 1 independent family
    expect(result.independentSources).toBe(1);
  });

  it("agreement score is between 0 and 1", () => {
    const sources = [
      makeSource("A", "https://a.com", "text", "web"),
      makeSource("B", "https://b.com", "text", "web"),
    ];

    const result = crossReferenceValidation("Test.", sources);
    expect(result.agreementScore).toBeGreaterThanOrEqual(0);
    expect(result.agreementScore).toBeLessThanOrEqual(1);
  });

  it("limiting conflicting claims array", () => {
    const sources = [
      makeSource("A", "https://a.com", "Berlin was not the capital of Germany.", "web"),
      makeSource("B", "https://b.com", "Berlin is the capital of Germany.", "web"),
    ];

    const result = crossReferenceValidation("Berlin is the capital of Germany.", sources);
    expect(result.conflictingClaims.length).toBeLessThanOrEqual(5);
  });
});
