import type { HallucinationSignal, HallucinationAnalysis, ClaimSource } from "@/types";

/**
 * Hallucination Detection Engine
 *
 * Uses statistical NLP methods to detect potential hallucinations by analyzing
 * the consistency between claims and their supporting evidence. This is a
 * "data science" approach that doesn't require external ML model training —
 * instead it uses proven statistical signals:
 *
 * 1. Entity mismatch detection — names/places in claim but not in evidence
 * 2. Numerical inconsistency — numbers in claim contradict evidence
 * 3. Date/time conflicts — temporal claims not supported by evidence
 * 4. Unsupported specificity — highly specific claims with no evidence
 * 5. Source fabrication patterns — fake-looking citations
 * 6. Evidence overlap — TF-IDF-inspired term overlap scoring
 */

// ── Helper: Extract significant terms from text ──

function extractTerms(text: string): Set<string> {
  // Remove common stop words and extract meaningful terms
  const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "must", "ought",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
    "them", "my", "your", "his", "its", "our", "their", "mine", "yours",
    "this", "that", "these", "those", "which", "who", "whom", "what",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "as",
    "into", "through", "during", "before", "after", "above", "below",
    "and", "or", "but", "not", "no", "nor", "so", "yet", "both",
    "if", "then", "else", "when", "where", "why", "how", "all", "each",
    "every", "some", "any", "few", "more", "most", "other", "than",
    "too", "very", "just", "also", "about", "up", "out", "over",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

// ── Helper: Extract named entities (proper nouns heuristic) ──

function extractEntities(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  // Filter out sentence-start capitalizations by checking position
  return matches.filter((entity) => {
    const idx = text.indexOf(entity);
    // Keep if not at start of sentence (after ". " or at position 0)
    return idx > 0 && text[idx - 1] !== "." && text[idx - 2] !== ".";
  });
}

// ── Helper: Extract numbers from text ──

function extractNumbers(text: string): number[] {
  const matches = text.match(/\b\d+(?:[.,]\d+)*\b/g) || [];
  return matches
    .map((m) => parseFloat(m.replace(/,/g, "")))
    .filter((n) => !isNaN(n));
}

// ── Helper: Extract year references ──

function extractYears(text: string): number[] {
  const matches = text.match(/\b(1[89]\d{2}|20[0-3]\d)\b/g) || [];
  return matches.map((m) => parseInt(m));
}

// ── Signal 1: Entity Mismatch ──

function detectEntityMismatch(
  claimText: string,
  evidenceText: string
): HallucinationSignal | null {
  const claimEntities = extractEntities(claimText);
  if (claimEntities.length === 0) return null;

  const evidenceLower = evidenceText.toLowerCase();
  const missingEntities = claimEntities.filter(
    (entity) => !evidenceLower.includes(entity.toLowerCase())
  );

  const mismatchRatio = missingEntities.length / claimEntities.length;

  if (mismatchRatio > 0.5 && missingEntities.length >= 2) {
    return {
      type: "entity_mismatch",
      severity: mismatchRatio > 0.8 ? "high" : "medium",
      confidence: Math.min(0.9, 0.4 + mismatchRatio * 0.5),
      detail: `${missingEntities.length}/${claimEntities.length} named entities not found in evidence: ${missingEntities.slice(0, 3).join(", ")}`,
    };
  }

  return null;
}

// ── Signal 2: Number Inconsistency ──

function detectNumberInconsistency(
  claimText: string,
  evidenceText: string
): HallucinationSignal | null {
  const claimNumbers = extractNumbers(claimText);
  if (claimNumbers.length === 0) return null;

  const evidenceNumbers = extractNumbers(evidenceText);
  if (evidenceNumbers.length === 0) {
    // Claim has numbers but evidence has none
    if (claimNumbers.length >= 2) {
      return {
        type: "number_inconsistency",
        severity: "medium",
        confidence: 0.5,
        detail: `Claim contains ${claimNumbers.length} numerical values but evidence has none.`,
      };
    }
    return null;
  }

  // Check for contradicting numbers (same order of magnitude, different values)
  const conflicts: string[] = [];
  for (const cn of claimNumbers) {
    for (const en of evidenceNumbers) {
      if (cn !== en && cn > 0 && en > 0) {
        const ratio = Math.max(cn, en) / Math.min(cn, en);
        if (ratio >= 1.1 && ratio <= 10) {
          // Close but different — potential hallucination
          conflicts.push(`claim: ${cn} vs evidence: ${en}`);
        }
      }
    }
  }

  if (conflicts.length > 0) {
    return {
      type: "number_inconsistency",
      severity: conflicts.length >= 2 ? "high" : "medium",
      confidence: Math.min(0.85, 0.4 + conflicts.length * 0.15),
      detail: `Numerical discrepancies found: ${conflicts.slice(0, 3).join("; ")}`,
    };
  }

  return null;
}

// ── Signal 3: Date/Time Conflict ──

function detectDateConflict(
  claimText: string,
  evidenceText: string
): HallucinationSignal | null {
  const claimYears = extractYears(claimText);
  if (claimYears.length === 0) return null;

  const evidenceYears = extractYears(evidenceText);
  if (evidenceYears.length === 0) {
    if (claimYears.length >= 1) {
      return {
        type: "date_conflict",
        severity: "low",
        confidence: 0.35,
        detail: `Claim mentions year(s) ${claimYears.join(", ")} but no dates found in evidence.`,
      };
    }
    return null;
  }

  // Check if claim years are NOT in evidence years
  const missingYears = claimYears.filter((y) => !evidenceYears.includes(y));
  if (missingYears.length > 0) {
    // Check if evidence mentions close but different years
    const closeConflicts = missingYears.filter((y) =>
      evidenceYears.some((ey) => Math.abs(y - ey) <= 3 && y !== ey)
    );

    if (closeConflicts.length > 0) {
      return {
        type: "date_conflict",
        severity: "high",
        confidence: 0.75,
        detail: `Temporal mismatch: claim says ${closeConflicts[0]} but evidence suggests ${evidenceYears.find((ey) => Math.abs(closeConflicts[0] - ey) <= 3)}`,
      };
    }
  }

  return null;
}

// ── Signal 4: Unsupported Specificity ──

function detectUnsupportedSpecificity(
  claimText: string,
  evidenceText: string
): HallucinationSignal | null {
  // Highly specific claims (many names, numbers, dates) with little evidence support
  const claimEntities = extractEntities(claimText);
  const claimNumbers = extractNumbers(claimText);
  const specificityScore = claimEntities.length + claimNumbers.length;

  if (specificityScore < 3) return null;

  const evidenceTerms = extractTerms(evidenceText);
  const claimTerms = extractTerms(claimText);

  let overlappingTerms = 0;
  for (const term of claimTerms) {
    if (evidenceTerms.has(term)) overlappingTerms++;
  }

  const overlapRatio = claimTerms.size > 0 ? overlappingTerms / claimTerms.size : 0;

  if (overlapRatio < 0.2 && specificityScore >= 3) {
    return {
      type: "unsupported_specificity",
      severity: "high",
      confidence: 0.65,
      detail: `Highly specific claim (${specificityScore} specific elements) has only ${Math.round(overlapRatio * 100)}% term overlap with evidence.`,
    };
  }

  return null;
}

// ── Signal 5: Source Fabrication Patterns ──

function detectSourceFabrication(claimText: string): HallucinationSignal | null {
  // Patterns that suggest fabricated citations
  const fabricationPatterns = [
    /according to (?:a |the )?(?:\d{4} )?(?:study|report|survey) (?:by|from|published in) .{5,50}(?:University|Institute|Journal|Research)/i,
    /\b(?:Dr\.|Professor|Prof\.) [A-Z][a-z]+ [A-Z][a-z]+(?:,? (?:at|from|of) (?:the )?[A-Z][a-z]+ (?:University|Institute|College))/i,
    /published in (?:the )?(?:Journal of|Proceedings of|Annals of) [A-Z]/i,
  ];

  let matchCount = 0;
  const matchText: string[] = [];

  for (const pattern of fabricationPatterns) {
    const match = claimText.match(pattern);
    if (match) {
      matchCount++;
      matchText.push(match[0]);
    }
  }

  if (matchCount >= 2) {
    return {
      type: "source_fabrication",
      severity: "high",
      confidence: 0.6,
      detail: `Multiple specific citation patterns detected that may be fabricated: "${matchText[0]}"`,
    };
  }

  return null;
}

// ── Signal 6: Low Evidence Overlap (TF-IDF inspired) ──

function detectLowEvidenceOverlap(
  claimText: string,
  evidenceText: string
): HallucinationSignal | null {
  if (!evidenceText || evidenceText.length < 20) {
    return {
      type: "low_evidence_overlap",
      severity: "medium",
      confidence: 0.5,
      detail: "Insufficient evidence text available for overlap analysis.",
    };
  }

  const claimTerms = extractTerms(claimText);
  const evidenceTerms = extractTerms(evidenceText);

  if (claimTerms.size === 0) return null;

  let overlap = 0;
  for (const term of claimTerms) {
    if (evidenceTerms.has(term)) overlap++;
  }

  const overlapRatio = overlap / claimTerms.size;

  if (overlapRatio < 0.15) {
    return {
      type: "low_evidence_overlap",
      severity: "high",
      confidence: 0.6,
      detail: `Only ${Math.round(overlapRatio * 100)}% term overlap between claim and evidence (${overlap}/${claimTerms.size} terms).`,
    };
  }

  if (overlapRatio < 0.3) {
    return {
      type: "low_evidence_overlap",
      severity: "medium",
      confidence: 0.45,
      detail: `Low term overlap (${Math.round(overlapRatio * 100)}%) between claim and evidence.`,
    };
  }

  return null;
}

/**
 * Analyze a claim against its evidence sources for hallucination signals.
 */
export function detectHallucinations(
  claimText: string,
  sources: ClaimSource[]
): HallucinationAnalysis {
  const evidenceText = sources
    .map((s) => `${s.title}. ${s.snippet}`)
    .join(" ");

  const signals: HallucinationSignal[] = [];

  // Run all detection signals
  const entityResult = detectEntityMismatch(claimText, evidenceText);
  if (entityResult) signals.push(entityResult);

  const numberResult = detectNumberInconsistency(claimText, evidenceText);
  if (numberResult) signals.push(numberResult);

  const dateResult = detectDateConflict(claimText, evidenceText);
  if (dateResult) signals.push(dateResult);

  const specificityResult = detectUnsupportedSpecificity(claimText, evidenceText);
  if (specificityResult) signals.push(specificityResult);

  const fabricationResult = detectSourceFabrication(claimText);
  if (fabricationResult) signals.push(fabricationResult);

  const overlapResult = detectLowEvidenceOverlap(claimText, evidenceText);
  if (overlapResult) signals.push(overlapResult);

  // Calculate overall risk score
  const severityWeights: Record<string, number> = {
    high: 0.9,
    medium: 0.5,
    low: 0.2,
  };

  const riskScore = signals.length > 0
    ? signals.reduce((sum, s) => sum + severityWeights[s.severity] * s.confidence, 0) / Math.max(signals.length, 1)
    : 0;

  const normalizedRisk = Math.min(1, riskScore);

  const riskLevel: HallucinationAnalysis["riskLevel"] =
    normalizedRisk >= 0.7 ? "critical"
    : normalizedRisk >= 0.5 ? "high"
    : normalizedRisk >= 0.25 ? "medium"
    : "low";

  return {
    riskScore: Math.round(normalizedRisk * 100) / 100,
    riskLevel,
    signals,
  };
}
