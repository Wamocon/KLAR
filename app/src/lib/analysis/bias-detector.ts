import type { ClaimSource } from "@/types";

export interface BiasSignal {
  type: "loaded_language" | "one_sided" | "emotional_appeal" | "false_balance" | "framing" | "cherry_picking";
  severity: "low" | "medium" | "high";
  detail: string;
  examples: string[];
}

export interface BiasAnalysis {
  overallScore: number; // 0 = neutral, 100 = highly biased
  biasLevel: "minimal" | "slight" | "moderate" | "significant" | "extreme";
  signals: BiasSignal[];
  loadedLanguageScore: number;
  emotionalAppealScore: number;
  sourceBalanceScore: number;
  framingScore: number;
  politicalLean: "left" | "center-left" | "center" | "center-right" | "right" | "unclear";
  summary: string;
}

// Loaded/emotional language indicators
const LOADED_WORDS = [
  // Superlatives and absolutes
  /\b(always|never|every|none|all|impossible|guaranteed|proven|undeniable|indisputable)\b/gi,
  // Emotional intensifiers
  /\b(outrageous|disgusting|horrifying|shocking|devastating|catastrophic|brilliant|amazing|incredible|unbelievable)\b/gi,
  // Propaganda terms
  /\b(regime|puppet|radical|extremist|terrorist|hero|patriot|traitor|elitist|corrupt)\b/gi,
  // Weasel words
  /\b(some say|many people|experts agree|studies show|it is known|clearly|obviously|everyone knows)\b/gi,
  // Scare quotes usage
  /[""](?:freedom|democracy|science|expert|truth|fact)["s"]/gi,
];

const EMOTIONAL_PATTERNS = [
  /\b(think of the children|blood on .* hands|slippery slope|wake up)\b/gi,
  /\b(what they don't want you to know|hidden truth|exposed|revealed|cover.?up)\b/gi,
  /!{2,}/g, // Multiple exclamation marks
  /\?{2,}/g, // Multiple question marks (rhetorical pressure)
  /\b(MUST|NEED|URGENT|BREAKING|CRITICAL|WARNING)\b/g, // ALL CAPS urgency
];

const FRAMING_PATTERNS = [
  // One-sided framing
  /\b(the only way|no alternative|the real question is|what .* won't tell you)\b/gi,
  // False dichotomy
  /\b(either .* or|you're either .* or|there are only two)\b/gi,
  // Appeal to authority without citation
  /\b(scientists say|experts believe|research proves|studies confirm)\b/gi,
  // Straw man indicators
  /\b(they want you to believe|they claim|opponents argue)\b/gi,
];

function countMatches(text: string, patterns: RegExp[]): { count: number; matches: string[] } {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) matches.push(...found);
    pattern.lastIndex = 0;
  }
  return { count: matches.length, matches };
}

function analyzeSourceBalance(sources: ClaimSource[]): { score: number; detail: string } {
  if (sources.length === 0) return { score: 50, detail: "No sources to evaluate balance." };

  const domains = new Set(sources.map(s => {
    try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return s.url; }
  }));

  const sourceTypes = new Set(sources.map(s => s.source_type));

  // More diverse sources = less bias
  const diversityRatio = domains.size / Math.max(sources.length, 1);
  const typeVariety = sourceTypes.size;

  if (diversityRatio >= 0.7 && typeVariety >= 2) return { score: 15, detail: "Good source diversity." };
  if (diversityRatio >= 0.5) return { score: 35, detail: "Moderate source diversity." };
  if (diversityRatio >= 0.3) return { score: 60, detail: "Limited source diversity — most sources from same outlets." };
  return { score: 80, detail: "Poor source diversity — heavy reliance on single source." };
}

export function detectBias(text: string, sources: ClaimSource[] = []): BiasAnalysis {
  const wordCount = text.split(/\s+/).length;
  const signals: BiasSignal[] = [];

  // 1. Loaded language detection
  const loaded = countMatches(text, LOADED_WORDS);
  const loadedRatio = loaded.count / Math.max(wordCount / 100, 1);
  const loadedLanguageScore = Math.min(100, Math.round(loadedRatio * 25));

  if (loaded.count >= 3) {
    signals.push({
      type: "loaded_language",
      severity: loaded.count >= 8 ? "high" : loaded.count >= 5 ? "medium" : "low",
      detail: `Found ${loaded.count} loaded/absolute terms.`,
      examples: loaded.matches.slice(0, 5),
    });
  }

  // 2. Emotional appeal detection
  const emotional = countMatches(text, EMOTIONAL_PATTERNS);
  const emotionalRatio = emotional.count / Math.max(wordCount / 100, 1);
  const emotionalAppealScore = Math.min(100, Math.round(emotionalRatio * 30));

  if (emotional.count >= 2) {
    signals.push({
      type: "emotional_appeal",
      severity: emotional.count >= 6 ? "high" : emotional.count >= 3 ? "medium" : "low",
      detail: `Found ${emotional.count} emotional appeal patterns.`,
      examples: emotional.matches.slice(0, 5),
    });
  }

  // 3. Framing analysis
  const framing = countMatches(text, FRAMING_PATTERNS);
  const framingScore = Math.min(100, Math.round((framing.count / Math.max(wordCount / 200, 1)) * 30));

  if (framing.count >= 2) {
    signals.push({
      type: "framing",
      severity: framing.count >= 5 ? "high" : framing.count >= 3 ? "medium" : "low",
      detail: `Found ${framing.count} framing/persuasion patterns.`,
      examples: framing.matches.slice(0, 5),
    });
  }

  // 4. Source balance
  const balance = analyzeSourceBalance(sources);
  const sourceBalanceScore = balance.score;

  if (sourceBalanceScore >= 50) {
    signals.push({
      type: "one_sided",
      severity: sourceBalanceScore >= 70 ? "high" : "medium",
      detail: balance.detail,
      examples: [],
    });
  }

  // 5. One-sided perspective check (presence of counter-arguments)
  const hasCounterArgs = /\b(however|on the other hand|critics argue|opponents say|alternatively|conversely|despite|although|nevertheless)\b/i.test(text);
  if (!hasCounterArgs && wordCount > 100) {
    signals.push({
      type: "one_sided",
      severity: wordCount > 300 ? "medium" : "low",
      detail: "No counter-arguments or alternative perspectives presented.",
      examples: [],
    });
  }

  // Composite score
  const overallScore = Math.min(100, Math.round(
    loadedLanguageScore * 0.3 +
    emotionalAppealScore * 0.25 +
    framingScore * 0.25 +
    sourceBalanceScore * 0.2
  ));

  const biasLevel: BiasAnalysis["biasLevel"] =
    overallScore <= 15 ? "minimal" :
    overallScore <= 30 ? "slight" :
    overallScore <= 50 ? "moderate" :
    overallScore <= 75 ? "significant" : "extreme";

  // Political lean (simplified heuristic — real production would use a trained model)
  const politicalLean: BiasAnalysis["politicalLean"] = "unclear";

  const summary = signals.length === 0
    ? "Text appears balanced and neutral."
    : `Detected ${signals.length} bias signal${signals.length > 1 ? "s" : ""}: ${signals.map(s => s.type.replace(/_/g, " ")).join(", ")}.`;

  return {
    overallScore,
    biasLevel,
    signals,
    loadedLanguageScore,
    emotionalAppealScore,
    sourceBalanceScore,
    framingScore,
    politicalLean,
    summary,
  };
}
