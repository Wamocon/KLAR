import type { ClaimSource } from "@/types";

export interface BiasSignal {
  type: "loaded_language" | "one_sided" | "emotional_appeal" | "false_balance" | "framing" | "cherry_picking" | "source_bias";
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

/**
 * Known media bias ratings — curated from AllSides, MBFC, Ad Fontes Media.
 * Ratings: -2 far-left, -1 left, 0 center, 1 right, 2 far-right.
 * Factual quality: 0-10 scale (10 = excellent factual reporting).
 * Updated April 2026. Only domains with established ratings included.
 */
const MEDIA_BIAS_DB: Record<string, { lean: number; factual: number; name: string }> = {
  // Center / high-factual
  "reuters.com": { lean: 0, factual: 9, name: "Reuters" },
  "apnews.com": { lean: 0, factual: 9, name: "AP News" },
  "bbc.com": { lean: 0, factual: 8, name: "BBC" },
  "bbc.co.uk": { lean: 0, factual: 8, name: "BBC" },
  "npr.org": { lean: -0.5, factual: 8, name: "NPR" },
  "pbs.org": { lean: -0.5, factual: 8, name: "PBS" },
  "csmonitor.com": { lean: 0, factual: 8, name: "Christian Science Monitor" },
  "economist.com": { lean: 0, factual: 8, name: "The Economist" },
  "dw.com": { lean: 0, factual: 8, name: "Deutsche Welle" },
  "france24.com": { lean: 0, factual: 8, name: "France 24" },
  "aljazeera.com": { lean: -0.5, factual: 6, name: "Al Jazeera" },
  "bloomberg.com": { lean: 0, factual: 8, name: "Bloomberg" },
  "ft.com": { lean: 0, factual: 8, name: "Financial Times" },
  "wsj.com": { lean: 0.5, factual: 8, name: "Wall Street Journal" },
  // Center-left
  "nytimes.com": { lean: -1, factual: 8, name: "New York Times" },
  "washingtonpost.com": { lean: -1, factual: 7, name: "Washington Post" },
  "theguardian.com": { lean: -1, factual: 7, name: "The Guardian" },
  "cnn.com": { lean: -1, factual: 6, name: "CNN" },
  "msnbc.com": { lean: -1.5, factual: 5, name: "MSNBC" },
  "nbcnews.com": { lean: -0.5, factual: 7, name: "NBC News" },
  "abcnews.go.com": { lean: -0.5, factual: 7, name: "ABC News" },
  "cbsnews.com": { lean: -0.5, factual: 7, name: "CBS News" },
  "politico.com": { lean: -0.5, factual: 7, name: "Politico" },
  "theatlantic.com": { lean: -1, factual: 7, name: "The Atlantic" },
  "vox.com": { lean: -1.5, factual: 6, name: "Vox" },
  "slate.com": { lean: -1, factual: 6, name: "Slate" },
  "huffpost.com": { lean: -1.5, factual: 5, name: "HuffPost" },
  "thedailybeast.com": { lean: -1.5, factual: 5, name: "The Daily Beast" },
  "motherjones.com": { lean: -2, factual: 6, name: "Mother Jones" },
  "salon.com": { lean: -2, factual: 5, name: "Salon" },
  "jacobin.com": { lean: -2, factual: 6, name: "Jacobin" },
  "thenation.com": { lean: -2, factual: 6, name: "The Nation" },
  // Center-right / Right
  "foxnews.com": { lean: 1.5, factual: 4, name: "Fox News" },
  "foxbusiness.com": { lean: 1, factual: 5, name: "Fox Business" },
  "nypost.com": { lean: 1.5, factual: 4, name: "New York Post" },
  "dailymail.co.uk": { lean: 1, factual: 3, name: "Daily Mail" },
  "washingtontimes.com": { lean: 1.5, factual: 5, name: "Washington Times" },
  "nationalreview.com": { lean: 1.5, factual: 6, name: "National Review" },
  "dailywire.com": { lean: 2, factual: 5, name: "The Daily Wire" },
  "breitbart.com": { lean: 2, factual: 2, name: "Breitbart" },
  "thefederalist.com": { lean: 2, factual: 4, name: "The Federalist" },
  "oann.com": { lean: 2, factual: 2, name: "OAN" },
  "newsmax.com": { lean: 2, factual: 3, name: "Newsmax" },
  "dailycaller.com": { lean: 1.5, factual: 4, name: "Daily Caller" },
  "spectator.org": { lean: 1.5, factual: 5, name: "The American Spectator" },
  "reason.com": { lean: 1, factual: 7, name: "Reason" },
  // Fact-checking
  "snopes.com": { lean: 0, factual: 9, name: "Snopes" },
  "factcheck.org": { lean: 0, factual: 10, name: "FactCheck.org" },
  "politifact.com": { lean: 0, factual: 9, name: "PolitiFact" },
  "fullfact.org": { lean: 0, factual: 9, name: "Full Fact" },
  "correctiv.org": { lean: 0, factual: 9, name: "Correctiv" },
  // German
  "tagesschau.de": { lean: 0, factual: 9, name: "Tagesschau" },
  "spiegel.de": { lean: -0.5, factual: 7, name: "Der Spiegel" },
  "zeit.de": { lean: -0.5, factual: 7, name: "Die Zeit" },
  "sueddeutsche.de": { lean: -0.5, factual: 7, name: "S\u00FCddeutsche Zeitung" },
  "faz.net": { lean: 0.5, factual: 7, name: "FAZ" },
  "welt.de": { lean: 0.5, factual: 6, name: "Die Welt" },
  "bild.de": { lean: 1, factual: 3, name: "Bild" },
  "taz.de": { lean: -1.5, factual: 6, name: "taz" },
  "nzz.ch": { lean: 0.5, factual: 8, name: "NZZ" },
  // Science / Academic
  "nature.com": { lean: 0, factual: 10, name: "Nature" },
  "science.org": { lean: 0, factual: 10, name: "Science" },
  "scientificamerican.com": { lean: -0.5, factual: 8, name: "Scientific American" },
  "arxiv.org": { lean: 0, factual: 9, name: "arXiv" },
  "pubmed.ncbi.nlm.nih.gov": { lean: 0, factual: 10, name: "PubMed" },
  "scholar.google.com": { lean: 0, factual: 9, name: "Google Scholar" },
  // Wikipedia
  "en.wikipedia.org": { lean: 0, factual: 7, name: "Wikipedia (EN)" },
  "de.wikipedia.org": { lean: 0, factual: 7, name: "Wikipedia (DE)" },
};

/**
 * Look up source in media bias database. Returns null if unknown.
 */
function getSourceBias(url: string): { lean: number; factual: number; name: string } | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (MEDIA_BIAS_DB[hostname]) return MEDIA_BIAS_DB[hostname];
    // Try parent domain (e.g., "news.bbc.co.uk" -> "bbc.co.uk")
    const parts = hostname.split(".");
    if (parts.length > 2) {
      const parent = parts.slice(-2).join(".");
      if (MEDIA_BIAS_DB[parent]) return MEDIA_BIAS_DB[parent];
      // For co.uk domains
      const parentCo = parts.slice(-3).join(".");
      if (MEDIA_BIAS_DB[parentCo]) return MEDIA_BIAS_DB[parentCo];
    }
  } catch { /* invalid URL */ }
  return null;
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

function analyzeSourceBalance(sources: ClaimSource[]): { score: number; detail: string; leanings: number[] } {
  if (sources.length === 0) return { score: 50, detail: "No sources to evaluate balance.", leanings: [] };

  const domains = new Set(sources.map(s => {
    try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return s.url; }
  }));

  const sourceTypes = new Set(sources.map(s => s.source_type));

  // Look up known bias ratings for all sources
  const knownBias: { lean: number; factual: number; name: string }[] = [];
  for (const source of sources) {
    const bias = getSourceBias(source.url);
    if (bias) knownBias.push(bias);
  }

  const leanings = knownBias.map(b => b.lean);
  const avgFactual = knownBias.length > 0
    ? knownBias.reduce((sum, b) => sum + b.factual, 0) / knownBias.length
    : 5;

  // Diversity metrics
  const diversityRatio = domains.size / Math.max(sources.length, 1);
  const typeVariety = sourceTypes.size;

  // Lean diversity: how spread are the sources across the political spectrum?
  let leanDiversityScore = 50;
  if (leanings.length >= 2) {
    const leanRange = Math.max(...leanings) - Math.min(...leanings);
    // Range 0 = all same lean (bad), Range 3+ = wide spread (good)
    leanDiversityScore = leanRange >= 2 ? 15 : leanRange >= 1 ? 30 : 60;
  }

  // Base score from structural diversity
  let baseScore: number;
  if (diversityRatio >= 0.7 && typeVariety >= 2) baseScore = 15;
  else if (diversityRatio >= 0.5) baseScore = 35;
  else if (diversityRatio >= 0.3) baseScore = 60;
  else baseScore = 80;

  // Blend structural diversity with lean diversity
  const score = Math.round(baseScore * 0.5 + leanDiversityScore * 0.3 + (10 - avgFactual) * 2);
  const detail = knownBias.length > 0
    ? `Source diversity: ${domains.size} unique domains, ${knownBias.length} sources with known bias ratings. Avg factual rating: ${avgFactual.toFixed(1)}/10.`
    : diversityRatio >= 0.7 && typeVariety >= 2 ? "Good source diversity."
    : diversityRatio >= 0.5 ? "Moderate source diversity."
    : "Limited source diversity.";

  return { score: Math.max(0, Math.min(100, score)), detail, leanings };
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

  // 4. Source balance (using media bias database)
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

  // 4b. Source-specific bias ratings (data-backed, from known media bias DB)
  const sourceBiasRatings: { name: string; lean: number; factual: number }[] = [];
  for (const source of sources) {
    const bias = getSourceBias(source.url);
    if (bias) sourceBiasRatings.push(bias);
  }

  if (sourceBiasRatings.length > 0) {
    const avgLean = sourceBiasRatings.reduce((sum, b) => sum + b.lean, 0) / sourceBiasRatings.length;
    const lowFactual = sourceBiasRatings.filter(b => b.factual <= 4);
    const highBias = sourceBiasRatings.filter(b => Math.abs(b.lean) >= 1.5);

    if (lowFactual.length > 0) {
      signals.push({
        type: "source_bias",
        severity: lowFactual.length >= 2 ? "high" : "medium",
        detail: `${lowFactual.length} source(s) with low factual rating (<=4/10): ${lowFactual.map(b => b.name).join(", ")}.`,
        examples: lowFactual.map(b => `${b.name}: factual ${b.factual}/10`),
      });
    }

    if (highBias.length > 0 && Math.abs(avgLean) >= 1) {
      signals.push({
        type: "source_bias",
        severity: Math.abs(avgLean) >= 1.5 ? "high" : "medium",
        detail: `Sources lean ${avgLean > 0 ? "right" : "left"} (avg: ${avgLean.toFixed(1)}). Known biased: ${highBias.map(b => b.name).join(", ")}.`,
        examples: highBias.map(b => `${b.name}: lean ${b.lean > 0 ? "+" : ""}${b.lean}`),
      });
    }
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

  // Political lean — derived from media bias database when sources are available
  let politicalLean: BiasAnalysis["politicalLean"] = "unclear";
  if (balance.leanings.length >= 2) {
    const avgLean = balance.leanings.reduce((a, b) => a + b, 0) / balance.leanings.length;
    politicalLean = avgLean <= -1.2 ? "left" :
      avgLean <= -0.4 ? "center-left" :
      avgLean <= 0.4 ? "center" :
      avgLean <= 1.2 ? "center-right" : "right";
  }

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
