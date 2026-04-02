import type { CrossReferenceResult, ClaimSource } from "@/types";
import { getSourceCredibility } from "@/lib/evidence/credibility";

/**
 * Cross-Reference Validation Engine
 *
 * Analyzes whether multiple independent sources agree on a claim.
 * Uses source independence assessment, domain diversity scoring,
 * and content consistency analysis.
 */

/**
 * Extract the root domain family for independence checks.
 * Different subdomains of the same parent = NOT independent.
 */
function getDomainFamily(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    // Return last two segments as the "family"
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

/**
 * Extract key factual assertions from a text snippet for comparison.
 * Uses simple sentence-level extraction.
 */
function extractAssertions(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 15);
}

/**
 * Compute term overlap ratio between two text snippets.
 */
function termOverlap(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(textB.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  return overlap / Math.min(wordsA.size, wordsB.size);
}

/**
 * Cross-reference validation for a claim's evidence sources.
 *
 * Evaluates:
 * 1. Source independence (different domain families)
 * 2. Content agreement (overlapping factual assertions)
 * 3. Source diversity (different categories: academic, news, wiki, etc.)
 * 4. Conflict detection (contradicting information between sources)
 */
export function crossReferenceValidation(
  claimText: string,
  sources: ClaimSource[]
): CrossReferenceResult {
  if (sources.length === 0) {
    return {
      agreementScore: 0,
      sourceConsensus: "none",
      independentSources: 0,
      conflictingClaims: [],
      supportingDetails: [],
    };
  }

  if (sources.length === 1) {
    return {
      agreementScore: 0.3,
      sourceConsensus: "weak",
      independentSources: 1,
      conflictingClaims: [],
      supportingDetails: [`Single source: ${sources[0].title}`],
    };
  }

  // 1. Count independent sources (different domain families)
  const domainFamilies = new Set<string>();
  for (const source of sources) {
    const family = getDomainFamily(source.url);
    if (family) domainFamilies.add(family);
  }
  const independentSources = domainFamilies.size;

  // 2. Assess source category diversity
  const categories = new Set<string>();
  for (const source of sources) {
    const cred = getSourceCredibility(source.url);
    categories.add(cred.category);
  }
  const categoryDiversity = categories.size / Math.min(sources.length, 5);

  // 3. Compute pairwise content agreement
  let totalPairAgreement = 0;
  let pairCount = 0;
  const supportingDetails: string[] = [];
  const conflictingClaims: string[] = [];

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const snippetA = sources[i].snippet;
      const snippetB = sources[j].snippet;

      if (!snippetA || !snippetB) continue;

      const overlap = termOverlap(snippetA, snippetB);
      totalPairAgreement += overlap;
      pairCount++;

      if (overlap > 0.3) {
        supportingDetails.push(
          `"${sources[i].title}" and "${sources[j].title}" share ${Math.round(overlap * 100)}% term overlap`
        );
      }

      // Simple conflict detection: check for negation patterns
      const assertionsA = extractAssertions(snippetA);
      const assertionsB = extractAssertions(snippetB);

      for (const a of assertionsA) {
        for (const b of assertionsB) {
          const aOverlap = termOverlap(a, b);
          if (aOverlap > 0.4) {
            // Similar assertions — check for negation
            const hasNegation = (text: string) =>
              /\b(not|never|no|isn't|wasn't|weren't|doesn't|didn't|couldn't|wouldn't)\b/.test(text);

            if (hasNegation(a) !== hasNegation(b)) {
              conflictingClaims.push(
                `Conflict between "${sources[i].title}" and "${sources[j].title}"`
              );
            }
          }
        }
      }
    }
  }

  const avgPairAgreement = pairCount > 0 ? totalPairAgreement / pairCount : 0;

  // 4. Calculate overall agreement score
  const independenceScore = Math.min(1, independentSources / 3); // 3+ independent = perfect
  const diversityScore = Math.min(1, categoryDiversity);
  const contentScore = avgPairAgreement;
  const conflictPenalty = Math.min(0.3, conflictingClaims.length * 0.1);

  const agreementScore = Math.round(
    Math.max(0, Math.min(1,
      independenceScore * 0.3 +
      diversityScore * 0.2 +
      contentScore * 0.4 +
      0.1 - // base
      conflictPenalty
    )) * 100
  ) / 100;

  // Determine consensus level
  let sourceConsensus: CrossReferenceResult["sourceConsensus"];
  if (agreementScore >= 0.7 && independentSources >= 3 && conflictingClaims.length === 0) {
    sourceConsensus = "strong";
  } else if (agreementScore >= 0.4 && independentSources >= 2) {
    sourceConsensus = "moderate";
  } else if (independentSources >= 1) {
    sourceConsensus = "weak";
  } else {
    sourceConsensus = "none";
  }

  return {
    agreementScore,
    sourceConsensus,
    independentSources,
    conflictingClaims: conflictingClaims.slice(0, 5),
    supportingDetails: supportingDetails.slice(0, 5),
  };
}
