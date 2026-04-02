import type { AdversarialDetectionType, AdversarialSeverity } from "@/types";

export interface DetectionResult {
  detected: boolean;
  type: AdversarialDetectionType;
  severity: AdversarialSeverity;
  confidence: number;
  details: Record<string, unknown>;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /system\s+prompt/i,
  /disregard\s+(?:all\s+)?(?:above|previous|prior)/i,
  /override\s+(?:your\s+)?(?:instructions|rules|guidelines)/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /do\s+anything\s+now/i,
  /pretend\s+(?:you\s+are|to\s+be)\s+a/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+restrictions/i,
];

const MANIPULATION_PATTERNS = [
  /(?:secretly|covertly)\s+(?:insert|add|embed|include)/i,
  /make\s+(?:it\s+)?(?:look|seem|appear)\s+(?:real|authentic|genuine)/i,
  /fabricat(?:e|ing)\s+(?:a\s+)?(?:story|article|news|report|source)/i,
  /generate\s+(?:fake|false|fabricated|misleading)/i,
  /create\s+(?:a\s+)?(?:disinformation|misinformation|propaganda)/i,
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _HALLUCINATION_INDICATORS = [
  /(?:as\s+of\s+)?\d{4},?\s+(?:the\s+)?(?:latest|recent|current)\s+(?:data|statistics|research|studies)\s+(?:show|indicate|suggest|prove)/i,
  /according\s+to\s+(?:a\s+)?(?:\d{4}\s+)?(?:study|report|survey)\s+(?:by|from|published)/i,
];

export function detectAdversarialContent(text: string): DetectionResult[] {
  const detections: DetectionResult[] = [];

  // Check prompt injection
  for (const pattern of INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      detections.push({
        detected: true,
        type: "prompt_injection",
        severity: "high",
        confidence: 0.9,
        details: {
          matched_pattern: match[0],
          position: match.index,
        },
      });
      break; // One prompt injection detection is enough
    }
  }

  // Check manipulation attempts
  for (const pattern of MANIPULATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      detections.push({
        detected: true,
        type: "manipulation",
        severity: "medium",
        confidence: 0.75,
        details: {
          matched_pattern: match[0],
          position: match.index,
        },
      });
      break;
    }
  }

  // Check for hallucination patterns (suspiciously specific claims)
  const hallucinationMatches = text.match(/\b(?:Dr\.|Professor)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:at|from|of)\s+(?:the\s+)?(?:University|Institute|Center|Centre)/gi);
  if (hallucinationMatches && hallucinationMatches.length >= 3) {
    detections.push({
      detected: true,
      type: "hallucination_pattern",
      severity: "low",
      confidence: 0.5,
      details: {
        matches: hallucinationMatches.length,
        note: "Multiple specific academic references may indicate hallucinated citations.",
      },
    });
  }

  // Check for potential factual fabrication (very specific numbers/stats without context)
  const fabricationPatterns = text.match(/\b\d{1,3}(?:\.\d+)?%/g);
  if (fabricationPatterns && fabricationPatterns.length >= 5) {
    detections.push({
      detected: true,
      type: "factual_fabrication",
      severity: "low",
      confidence: 0.4,
      details: {
        statistical_claims_count: fabricationPatterns.length,
        note: "High density of statistical claims may warrant verification.",
      },
    });
  }

  // Synthetic text detection (repetitive patterns)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length >= 5) {
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length;
    const lengthVariance = sentences.reduce((sum, s) => sum + Math.pow(s.trim().length - avgLength, 2), 0) / sentences.length;
    const stdDev = Math.sqrt(lengthVariance);

    // Very uniform sentence lengths suggest synthetic generation
    if (stdDev < avgLength * 0.15 && avgLength > 30) {
      detections.push({
        detected: true,
        type: "synthetic_text",
        severity: "low",
        confidence: 0.45,
        details: {
          avg_sentence_length: Math.round(avgLength),
          std_deviation: Math.round(stdDev),
          sentence_count: sentences.length,
          note: "Unusually uniform sentence structure may indicate AI-generated text.",
        },
      });
    }
  }

  return detections;
}

export function getOverallThreatLevel(
  detections: DetectionResult[]
): { level: AdversarialSeverity; score: number } {
  if (detections.length === 0) {
    return { level: "low", score: 0 };
  }

  const severityWeights: Record<AdversarialSeverity, number> = {
    critical: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.2,
  };

  const maxSeverity = detections.reduce((max, d) => {
    return severityWeights[d.severity] > severityWeights[max]
      ? d.severity
      : max;
  }, "low" as AdversarialSeverity);

  const avgConfidence =
    detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;

  const score = Math.round(
    severityWeights[maxSeverity] * avgConfidence * 100
  );

  return { level: maxSeverity, score };
}
