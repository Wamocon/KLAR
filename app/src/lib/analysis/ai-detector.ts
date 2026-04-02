export interface AIDetectionSignal {
  type: "perplexity" | "burstiness" | "vocabulary" | "sentence_uniformity" | "hedging" | "repetitive_structure" | "filler_pattern";
  score: number; // 0–100, higher = more likely AI
  detail: string;
}

export interface AIDetectionResult {
  overallScore: number; // 0 = human, 100 = AI-generated
  verdict: "human" | "likely_human" | "mixed" | "likely_ai" | "ai_generated";
  confidence: number;
  signals: AIDetectionSignal[];
  sentenceAnalysis: {
    avgLength: number;
    lengthVariance: number;
    uniformityScore: number;
  };
  vocabularyAnalysis: {
    uniqueWords: number;
    totalWords: number;
    typeTokenRatio: number;
    lexicalDiversity: number;
  };
  summary: string;
}

// Common AI hedging phrases (2024-2026 LLM patterns)
const AI_HEDGING = [
  /\b(it'?s worth noting that|it'?s important to note|it should be noted)\b/gi,
  /\b(in this context|in the context of|with respect to)\b/gi,
  /\b(as (?:an|a) (?:AI|language model|assistant))\b/gi,
  /\b(I (?:don't|do not) have (?:access to|the ability))\b/gi,
  /\b((?:broadly|generally|typically|essentially) speaking)\b/gi,
  /\b(it'?s (?:crucial|essential|vital|imperative) to (?:understand|recognize|acknowledge))\b/gi,
  /\b((?:delve|dive|unpack|unravel|embark|leverage|utilize|multifaceted|holistic|synergy))\b/gi,
  /\b(in (?:summary|conclusion|essence|other words))\b/gi,
  /\b(?:furthermore|moreover|additionally|consequently|nevertheless)\b/gi,
  /\b(this (?:highlights|underscores|emphasizes|demonstrates|showcases|illustrates) the (?:importance|significance|need|value))\b/gi,
];

// AI structural patterns
const AI_STRUCTURE = [
  /^\d+\.\s+\*\*[^*]+\*\*/gm, // Numbered bold headers (markdown lists)
  /^[-•]\s+\*\*[^*]+\*\*:/gm, // Bullet bold key-value
  /\b(firstly|secondly|thirdly|lastly|finally)\b/gi, // Over-structured transitions
  /^(?:#{1,3})\s+/gm, // Markdown headers in plain text
];

function calculateSentenceStats(text: string): { lengths: number[]; avg: number; variance: number; uniformity: number } {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length < 3) return { lengths: [], avg: 0, variance: 0, uniformity: 0 };

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + (l - avg) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const coeffOfVariation = avg > 0 ? stdDev / avg : 0;

  // AI text tends to have LOW variation (uniform sentence lengths)
  // Human text has HIGH variation (short punchy + long complex)
  // CoV < 0.3 = very uniform (AI-like), > 0.6 = varied (human-like)
  const uniformity = Math.max(0, Math.min(100, Math.round((1 - coeffOfVariation) * 100)));

  return { lengths, avg, variance, uniformity };
}

function calculateVocabularyStats(text: string): { unique: number; total: number; ttr: number; diversity: number } {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  const unique = new Set(words).size;
  const total = words.length;
  const ttr = total > 0 ? unique / total : 0;

  // AI tends to have lower TTR (reuses vocabulary more) but moderate for long texts
  // Corrected TTR (per 100-word chunks)
  const chunkSize = 100;
  const correctedTtrs: number[] = [];
  for (let i = 0; i + chunkSize <= words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    correctedTtrs.push(new Set(chunk).size / chunkSize);
  }

  const avgChunkTtr = correctedTtrs.length > 0
    ? correctedTtrs.reduce((a, b) => a + b, 0) / correctedTtrs.length
    : ttr;

  // AI: ~0.55-0.65 corrected TTR. Human: ~0.65-0.85
  const diversity = Math.max(0, Math.min(100, Math.round((1 - avgChunkTtr) * 150)));

  return { unique, total, ttr, diversity };
}

function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
    pattern.lastIndex = 0;
  }
  return count;
}

export function detectAIContent(text: string): AIDetectionResult {
  const signals: AIDetectionSignal[] = [];
  const wordCount = text.split(/\s+/).length;

  if (wordCount < 30) {
    return {
      overallScore: 0,
      verdict: "human",
      confidence: 0.2,
      signals: [],
      sentenceAnalysis: { avgLength: 0, lengthVariance: 0, uniformityScore: 0 },
      vocabularyAnalysis: { uniqueWords: 0, totalWords: wordCount, typeTokenRatio: 0, lexicalDiversity: 0 },
      summary: "Text too short for reliable AI detection.",
    };
  }

  // 1. Sentence uniformity
  const sentenceStats = calculateSentenceStats(text);
  if (sentenceStats.uniformity > 65) {
    signals.push({
      type: "sentence_uniformity",
      score: sentenceStats.uniformity,
      detail: `Sentence lengths are very uniform (${sentenceStats.uniformity}% uniformity). AI tends to produce consistent sentence lengths.`,
    });
  }

  // 2. Vocabulary analysis
  const vocabStats = calculateVocabularyStats(text);
  if (vocabStats.diversity > 55) {
    signals.push({
      type: "vocabulary",
      score: vocabStats.diversity,
      detail: `Vocabulary diversity score of ${vocabStats.diversity}% suggests repetitive word usage patterns typical of AI.`,
    });
  }

  // 3. Hedging phrases
  const hedgingCount = countPatternMatches(text, AI_HEDGING);
  const hedgingRatio = hedgingCount / Math.max(wordCount / 100, 1);
  const hedgingScore = Math.min(100, Math.round(hedgingRatio * 20));
  if (hedgingCount >= 2) {
    signals.push({
      type: "hedging",
      score: hedgingScore,
      detail: `Found ${hedgingCount} AI-typical hedging/filler phrases.`,
    });
  }

  // 4. Structural patterns
  const structureCount = countPatternMatches(text, AI_STRUCTURE);
  const structureScore = Math.min(100, Math.round((structureCount / Math.max(wordCount / 200, 1)) * 25));
  if (structureCount >= 3) {
    signals.push({
      type: "repetitive_structure",
      score: structureScore,
      detail: `Found ${structureCount} structured formatting patterns (numbered lists, bold headers) typical of AI output.`,
    });
  }

  // 5. Paragraph transition words (AI overuses these)
  const transitionOveruse = text.match(/\b(furthermore|moreover|additionally|consequently|nevertheless|nonetheless|in addition|as a result)\b/gi);
  if (transitionOveruse && transitionOveruse.length >= 3) {
    const fillerScore = Math.min(100, transitionOveruse.length * 12);
    signals.push({
      type: "filler_pattern",
      score: fillerScore,
      detail: `${transitionOveruse.length} formal transition words — AI tends to overuse academic connectors.`,
    });
  }

  // Composite score (weighted)
  const weights = {
    sentence_uniformity: 0.25,
    vocabulary: 0.2,
    hedging: 0.2,
    repetitive_structure: 0.15,
    filler_pattern: 0.1,
    perplexity: 0.1,
  };

  let weightedSum = 0;
  let weightTotal = 0;
  for (const signal of signals) {
    const w = weights[signal.type as keyof typeof weights] || 0.1;
    weightedSum += signal.score * w;
    weightTotal += w;
  }

  const overallScore = weightTotal > 0 ? Math.min(100, Math.round(weightedSum / weightTotal)) : 15;

  const verdict: AIDetectionResult["verdict"] =
    overallScore <= 20 ? "human" :
    overallScore <= 40 ? "likely_human" :
    overallScore <= 60 ? "mixed" :
    overallScore <= 80 ? "likely_ai" : "ai_generated";

  const confidence = Math.min(0.95, 0.4 + (signals.length * 0.1) + (wordCount > 200 ? 0.15 : 0));

  const summary = verdict === "human" || verdict === "likely_human"
    ? "Text appears to be human-written."
    : verdict === "mixed"
    ? "Text shows a mix of human and AI characteristics — possibly AI-assisted."
    : `Text shows strong AI-generation signals (${signals.length} indicators detected).`;

  return {
    overallScore,
    verdict,
    confidence,
    signals,
    sentenceAnalysis: {
      avgLength: Math.round(sentenceStats.avg * 10) / 10,
      lengthVariance: Math.round(sentenceStats.variance * 10) / 10,
      uniformityScore: sentenceStats.uniformity,
    },
    vocabularyAnalysis: {
      uniqueWords: vocabStats.unique,
      totalWords: vocabStats.total,
      typeTokenRatio: Math.round(vocabStats.ttr * 1000) / 1000,
      lexicalDiversity: vocabStats.diversity,
    },
    summary,
  };
}
