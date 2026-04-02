import type { ClaimSource } from "@/types";

export interface PlagiarismMatch {
  text: string;
  matchedSource: string;
  sourceUrl: string;
  similarity: number;
}

export interface PlagiarismResult {
  overallScore: number; // 0 = original, 100 = plagiarized
  verdict: "original" | "mostly_original" | "some_overlap" | "significant_overlap" | "likely_plagiarized";
  matches: PlagiarismMatch[];
  originalityPercent: number;
  summary: string;
}

/**
 * Compute n-grams from text for similarity comparison.
 */
function getNgrams(text: string, n: number): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  const ngrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

/**
 * Jaccard similarity between two sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Find overlapping text fragments between input and source snippets.
 */
function findOverlaps(text: string, snippet: string, minWords: number = 5): string[] {
  const snippetWords = snippet.toLowerCase().split(/\s+/);
  const overlaps: string[] = [];

  for (let len = Math.min(snippetWords.length, 15); len >= minWords; len--) {
    for (let i = 0; i <= snippetWords.length - len; i++) {
      const phrase = snippetWords.slice(i, i + len).join(" ");
      if (text.toLowerCase().includes(phrase)) {
        // Avoid sub-matches of already found overlaps
        if (!overlaps.some(o => o.includes(phrase) || phrase.includes(o))) {
          overlaps.push(phrase);
        }
      }
    }
  }

  return overlaps;
}

/**
 * Detect plagiarism by comparing input text against evidence sources.
 * Uses n-gram overlap and longest common subsequence analysis.
 */
export function detectPlagiarism(text: string, sources: ClaimSource[]): PlagiarismResult {
  if (sources.length === 0) {
    return {
      overallScore: 0,
      verdict: "original",
      matches: [],
      originalityPercent: 100,
      summary: "No sources available for comparison.",
    };
  }

  const textNgrams4 = getNgrams(text, 4);
  const textNgrams6 = getNgrams(text, 6);
  const matches: PlagiarismMatch[] = [];
  let maxSimilarity = 0;

  for (const source of sources) {
    if (!source.snippet || source.snippet.trim().length < 20) continue;

    const snippetNgrams4 = getNgrams(source.snippet, 4);
    const snippetNgrams6 = getNgrams(source.snippet, 6);

    // 4-gram similarity (catches paraphrasing)
    const sim4 = jaccardSimilarity(textNgrams4, snippetNgrams4);
    // 6-gram similarity (catches direct copying)
    const sim6 = jaccardSimilarity(textNgrams6, snippetNgrams6);

    // Weighted: direct copying is more significant
    const similarity = sim4 * 0.4 + sim6 * 0.6;

    if (similarity > maxSimilarity) maxSimilarity = similarity;

    // Find specific overlapping phrases
    const overlaps = findOverlaps(text, source.snippet);
    
    if (overlaps.length > 0 || similarity > 0.05) {
      const matchSimilarity = Math.round(Math.max(similarity * 100, overlaps.length > 0 ? 30 : 0));
      if (matchSimilarity > 10) {
        matches.push({
          text: overlaps[0] || source.snippet.slice(0, 80) + "…",
          matchedSource: source.title,
          sourceUrl: source.url,
          similarity: Math.min(100, matchSimilarity),
        });
      }
    }
  }

  // Sort matches by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  // Composite score
  const avgMatchSim = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length
    : 0;
  const matchCoverage = Math.min(1, matches.length / Math.max(sources.length, 1));
  
  const overallScore = Math.min(100, Math.round(
    avgMatchSim * 0.6 + matchCoverage * 40
  ));

  const originalityPercent = Math.max(0, 100 - overallScore);

  const verdict: PlagiarismResult["verdict"] =
    overallScore <= 10 ? "original" :
    overallScore <= 25 ? "mostly_original" :
    overallScore <= 50 ? "some_overlap" :
    overallScore <= 75 ? "significant_overlap" : "likely_plagiarized";

  const summary = matches.length === 0
    ? "No significant text overlap found with known sources."
    : `Found ${matches.length} potential match${matches.length > 1 ? "es" : ""} with existing sources. ${originalityPercent}% appears original.`;

  return {
    overallScore,
    verdict,
    matches: matches.slice(0, 10), // Top 10 matches
    originalityPercent,
    summary,
  };
}
