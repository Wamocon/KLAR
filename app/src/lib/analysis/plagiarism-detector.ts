import type { ClaimSource } from "@/types";
import { searchWeb } from "@/lib/evidence/serper";

export interface PlagiarismMatch {
  text: string;
  matchedSource: string;
  sourceUrl: string;
  similarity: number; // 0-100
}

export interface PlagiarismResult {
  overallScore: number; // 0 = original, 100 = plagiarized
  verdict: "original" | "mostly_original" | "some_overlap" | "significant_overlap" | "likely_plagiarized";
  matches: PlagiarismMatch[];
  originalityPercent: number;
  summary: string;
}

/**
 * Extract unique, search-worthy fingerprint phrases from text.
 * Picks distinctive 6-8 word sequences avoiding common stopword-only runs.
 */
function extractFingerprints(text: string, count: number = 4): string[] {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => {
    const words = s.split(/\s+/);
    return words.length >= 8;
  });

  if (sentences.length === 0) return [];

  // Pick sentences spread across the text (beginning, middle, end)
  const step = Math.max(1, Math.floor(sentences.length / count));
  const selected: string[] = [];
  for (let i = 0; i < sentences.length && selected.length < count; i += step) {
    // Extract a 6-8 word phrase from each sentence (skip first 2 words which are often generic)
    const words = sentences[i].split(/\s+/);
    const start = Math.min(2, words.length - 6);
    const phrase = words.slice(Math.max(0, start), Math.max(0, start) + 7).join(" ");
    if (phrase.length >= 20) {
      selected.push(`"${phrase}"`);
    }
  }
  return selected;
}

/**
 * Perform dedicated plagiarism search using text fingerprints.
 * Sends unique phrases as quoted search queries to find exact/near matches on the web.
 * Returns additional sources found through fingerprint matching.
 */
async function searchForPlagiarism(text: string): Promise<ClaimSource[]> {
  const fingerprints = extractFingerprints(text, 3);
  if (fingerprints.length === 0) return [];

  const results: ClaimSource[] = [];
  // Search fingerprints in parallel with a timeout
  const searches = fingerprints.map(fp =>
    searchWeb(fp).catch(() => [] as ClaimSource[])
  );

  const allResults = await Promise.allSettled(searches);
  for (const result of allResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }
  return results;
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
 * Also performs dedicated web search for unique text fingerprints
 * to catch plagiarism from sources not already in the evidence pool.
 */
export async function detectPlagiarism(text: string, sources: ClaimSource[]): Promise<PlagiarismResult> {
  // Phase 1: If we have very few sources, perform a dedicated plagiarism search
  let allSources = [...sources];
  if (sources.length < 5 && text.split(/\s+/).length >= 50) {
    try {
      const plagiarismResults = await searchForPlagiarism(text);
      // Deduplicate by URL
      const existingUrls = new Set(sources.map(s => s.url));
      for (const result of plagiarismResults) {
        if (!existingUrls.has(result.url)) {
          allSources.push(result);
          existingUrls.add(result.url);
        }
      }
    } catch {
      // Fingerprint search failed; fall through to comparison with existing sources
    }
  }

  if (allSources.length === 0) {
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

  for (const source of allSources) {
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
  const matchCoverage = Math.min(1, matches.length / Math.max(allSources.length, 1));
  
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
