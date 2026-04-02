import type { ClaimQualityScore, ExtractedClaim } from "@/types";

/**
 * NLP Claim Quality Scoring Engine
 *
 * Uses statistical NLP heuristics (no external ML model needed) to evaluate
 * claim quality before sending to Gemini. This helps:
 * - Filter out low-quality/vague claims
 * - Prioritize specific, verifiable claims
 * - Detect opinion vs. fact
 * - Improve overall verification accuracy
 */

// ── Sentiment / Subjectivity word lists ──

const OPINION_MARKERS = new Set([
  "think", "believe", "feel", "seems", "appears", "arguably", "probably",
  "likely", "perhaps", "maybe", "possibly", "might", "could", "should",
  "obviously", "clearly", "undoubtedly", "definitely", "personally",
  "in my opinion", "in my view", "i think", "i believe",
  "best", "worst", "amazing", "terrible", "wonderful", "horrible",
  "beautiful", "ugly", "perfect", "awful", "incredible", "fantastic",
]);

const HEDGING_WORDS = new Set([
  "somewhat", "rather", "quite", "fairly", "slightly", "a bit",
  "sort of", "kind of", "more or less", "approximately", "roughly",
  "around", "about", "nearly", "almost", "essentially",
]);

const QUANTIFIER_PATTERNS = /\b(\d+[\.,]?\d*\s*(%|percent|million|billion|trillion|thousand|hundred)|\d{4}|\$\d+|€\d+|£\d+)\b/gi;

const DATE_PATTERNS = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{2,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+\d{1,2})\b/gi;

const NAMED_ENTITY_HEURISTIC = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;

/**
 * Score how specific the claim is (named entities, numbers, dates, measurements).
 * More specific = more verifiable.
 */
function scoreSpecificity(text: string): number {
  const words = text.split(/\s+/).length;
  if (words < 3) return 0.1;

  let score = 0;
  const factors: string[] = [];

  // Named entities (proper nouns: consecutive capitalized words)
  const entities = text.match(NAMED_ENTITY_HEURISTIC) || [];
  if (entities.length > 0) {
    score += Math.min(0.3, entities.length * 0.1);
    factors.push(`entities:${entities.length}`);
  }

  // Quantitative data (numbers, percentages, currency)
  const numbers = text.match(QUANTIFIER_PATTERNS) || [];
  if (numbers.length > 0) {
    score += Math.min(0.3, numbers.length * 0.15);
    factors.push(`quantities:${numbers.length}`);
  }

  // Dates
  const dates = text.match(DATE_PATTERNS) || [];
  if (dates.length > 0) {
    score += Math.min(0.2, dates.length * 0.1);
    factors.push(`dates:${dates.length}`);
  }

  // Word count bonus (longer claims tend to be more specific)
  if (words >= 8 && words <= 30) {
    score += 0.15;
  } else if (words > 30) {
    score += 0.1; // Very long claims might be compound
  }

  return Math.min(1, score + 0.05); // Base score of 0.05
}

/**
 * Score whether the claim is atomic (single verifiable statement vs. compound).
 */
function scoreAtomicity(text: string): number {
  const coordinators = (text.match(/\b(and|or|but|while|whereas|however|although|moreover|furthermore)\b/gi) || []).length;
  const semicolons = (text.match(/;/g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;

  // Multiple coordinating conjunctions suggest compound claims
  const compoundScore = coordinators + semicolons + Math.max(0, commaCount - 2) * 0.5;

  if (compoundScore === 0) return 1.0;
  if (compoundScore <= 1) return 0.8;
  if (compoundScore <= 2) return 0.6;
  if (compoundScore <= 3) return 0.4;
  return 0.2;
}

/**
 * Score whether the claim is objective (fact vs. opinion).
 */
function scoreObjectivity(text: string): number {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  let opinionCount = 0;
  let hedgingCount = 0;

  for (const word of words) {
    if (OPINION_MARKERS.has(word)) opinionCount++;
    if (HEDGING_WORDS.has(word)) hedgingCount++;
  }

  // Check multi-word patterns
  for (const phrase of OPINION_MARKERS) {
    if (phrase.includes(" ") && lower.includes(phrase)) {
      opinionCount++;
    }
  }

  const totalSubjective = opinionCount + hedgingCount * 0.5;

  if (totalSubjective === 0) return 1.0;
  if (totalSubjective <= 1) return 0.7;
  if (totalSubjective <= 2) return 0.5;
  return 0.3;
}

/**
 * Score how verifiable the claim is.
 * Questions, hypotheticals, and predictions are harder to verify.
 */
function scoreVerifiability(text: string): number {
  const lower = text.toLowerCase().trim();

  // Questions are not verifiable claims
  if (text.endsWith("?")) return 0.1;

  // Future predictions
  if (/\b(will|shall|going to|is expected to|is projected to)\b/i.test(text)) {
    return 0.3;
  }

  // Hypotheticals
  if (/\b(if|would|could have|might have|should have)\b/i.test(lower)) {
    return 0.4;
  }

  // Imperatives / commands
  if (/^(let|do|don't|please|always|never)\b/i.test(lower)) {
    return 0.2;
  }

  // Historical / present-tense factual statements are most verifiable
  if (/\b(is|are|was|were|has|have|had)\b/.test(text)) {
    return 0.9;
  }

  return 0.7;
}

/**
 * Score named entity density — claims with more entities
 * relative to word count are typically more specific.
 */
function scoreEntityDensity(text: string): number {
  const words = text.split(/\s+/).length;
  if (words < 3) return 0.1;

  const entities = text.match(NAMED_ENTITY_HEURISTIC) || [];
  const entityWords = entities.join(" ").split(/\s+/).length;
  const density = entityWords / words;

  if (density >= 0.3) return 1.0;
  if (density >= 0.2) return 0.8;
  if (density >= 0.1) return 0.6;
  if (density > 0) return 0.4;
  return 0.2;
}

/**
 * Generate quality flags for the claim.
 */
function generateFlags(text: string, scores: Omit<ClaimQualityScore, "overall" | "flags">): string[] {
  const flags: string[] = [];

  if (scores.objectivity < 0.5) flags.push("opinion_detected");
  if (scores.atomicity < 0.5) flags.push("compound_claim");
  if (scores.specificity < 0.3) flags.push("too_vague");
  if (scores.verifiability < 0.4) flags.push("hard_to_verify");
  if (text.split(/\s+/).length < 5) flags.push("too_short");
  if (text.split(/\s+/).length > 50) flags.push("too_long");
  if (scores.entityDensity >= 0.8) flags.push("entity_rich");
  if (scores.specificity >= 0.7 && scores.verifiability >= 0.8) flags.push("high_quality");

  return flags;
}

/**
 * Analyze the quality of an extracted claim using NLP heuristics.
 * Returns a multi-dimensional quality score.
 */
export function analyzeClaimQuality(claim: ExtractedClaim): ClaimQualityScore {
  const text = claim.claim_text;

  const specificity = scoreSpecificity(text);
  const atomicity = scoreAtomicity(text);
  const objectivity = scoreObjectivity(text);
  const verifiability = scoreVerifiability(text);
  const entityDensity = scoreEntityDensity(text);

  const scores = { specificity, atomicity, objectivity, verifiability, entityDensity };
  const flags = generateFlags(text, scores);

  // Weighted overall score
  const overall =
    specificity * 0.25 +
    atomicity * 0.15 +
    objectivity * 0.2 +
    verifiability * 0.25 +
    entityDensity * 0.15;

  return {
    overall: Math.round(overall * 100) / 100,
    specificity: Math.round(specificity * 100) / 100,
    atomicity: Math.round(atomicity * 100) / 100,
    objectivity: Math.round(objectivity * 100) / 100,
    verifiability: Math.round(verifiability * 100) / 100,
    entityDensity: Math.round(entityDensity * 100) / 100,
    flags,
  };
}

/**
 * Batch-analyze all claims and return those that meet a minimum quality threshold.
 */
export function filterHighQualityClaims(
  claims: ExtractedClaim[],
  minQuality: number = 0.3
): { claim: ExtractedClaim; quality: ClaimQualityScore }[] {
  return claims
    .map((claim) => ({ claim, quality: analyzeClaimQuality(claim) }))
    .filter((item) => item.quality.overall >= minQuality);
}
