import type { ClaimSource, ExtractedClaim } from "@/types";
import { searchWikipedia, searchWikidata } from "./wikipedia";
import { searchWeb } from "./serper";
import { searchGrounded } from "./grounded-search";
import { retrieveKnowledge, knowledgeToSources } from "@/lib/rag/retrieval";

/** Wrap a promise with a timeout — resolves to fallback on timeout instead of rejecting */
function withFallback<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ── Query extraction ──
// Stop words to remove from search queries (common words that add noise)
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "about", "above",
  "after", "again", "against", "all", "am", "and", "any", "as", "at",
  "because", "before", "below", "between", "both", "but", "by", "down",
  "during", "each", "few", "for", "from", "further", "get", "got",
  "he", "her", "here", "hers", "herself", "him", "himself", "his",
  "how", "i", "if", "in", "into", "it", "its", "itself", "just",
  "let", "like", "me", "more", "most", "my", "myself", "no", "nor",
  "not", "now", "of", "off", "on", "once", "only", "or", "other",
  "our", "ours", "ourselves", "out", "over", "own", "same", "she",
  "so", "some", "such", "than", "that", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those",
  "through", "to", "too", "under", "until", "up", "very", "we",
  "what", "when", "where", "which", "while", "who", "whom", "why",
  "with", "you", "your", "yours", "yourself", "yourselves",
  "also", "around", "currently", "right", "already", "still",
  "according", "says", "said", "approximately", "roughly", "nearly",
  // German stop words
  "der", "die", "das", "ein", "eine", "einer", "eines", "einem", "einen",
  "ist", "sind", "war", "waren", "wird", "werden", "wurde", "wurden",
  "hat", "haben", "hatte", "hatten", "kann", "können", "konnte", "konnten",
  "soll", "sollen", "muss", "müssen", "darf", "dürfen", "mag", "mögen",
  "und", "oder", "aber", "denn", "weil", "wenn", "als", "dass",
  "nicht", "kein", "keine", "keinen", "keinem", "keiner",
  "von", "zu", "bei", "mit", "für", "auf", "an", "in", "aus",
  "nach", "über", "vor", "zwischen", "durch", "um", "bis",
  "sich", "ich", "du", "er", "sie", "es", "wir", "ihr",
  "den", "dem", "des", "im", "am", "zum", "zur",
  "auch", "noch", "schon", "sehr", "nur", "dann", "mehr",
]);

/**
 * Extract focused search keywords from a claim.
 * Removes stop words, pulls out entities, numbers, and key terms.
 * Produces a short, targeted query instead of the full sentence.
 */
function extractSearchQuery(claimText: string): { webQuery: string; wikiQuery: string; entities: string[] } {
  // Extract quoted text, proper nouns (capitalized words), numbers with units
  const entities: string[] = [];

  // Pull out quoted strings
  const quotedMatches = claimText.match(/"[^"]+"|'[^']+'/g);
  if (quotedMatches) entities.push(...quotedMatches.map(q => q.replace(/['"]/g, "")));

  // Pull out numbers with context (e.g., "200 EUR", "15%", "2026")
  const numberMatches = claimText.match(/\d[\d,.]*\s*(?:%|EUR|USD|GBP|€|\$|£|million|billion|Mio|Mrd|km|kg|mg|ml|liter|tons?|years?|months?|days?|hours?|minutes?|seconds?)?/gi);
  if (numberMatches) entities.push(...numberMatches.map(n => n.trim()));

  // Pull out capitalized multi-word proper nouns (e.g., "IPC-Computer", "San Francisco")
  const properNouns = claimText.match(/(?:[A-ZÄÖÜ][a-zäöüß]+(?:[-][A-ZÄÖÜ]?[a-zäöüß]+)*\s*){1,3}/g);
  if (properNouns) {
    for (const pn of properNouns) {
      const trimmed = pn.trim();
      // Skip if it's just a sentence-start capitalization (first word)
      if (trimmed.length > 2 && !STOP_WORDS.has(trimmed.toLowerCase())) {
        entities.push(trimmed);
      }
    }
  }

  // Build keyword query by removing stop words
  const words = claimText
    .replace(/["""''(),;:!?.]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  // Web query: use the top keywords (max 8 words) — Google handles these well
  const webQuery = words.slice(0, 8).join(" ");

  // Wiki query: use entities + key nouns — Wikipedia search works best with proper nouns
  const wikiKeywords = entities.length > 0
    ? entities.slice(0, 3).join(" ")
    : words.filter(w => w[0] === w[0].toUpperCase() || w.length > 5).slice(0, 4).join(" ");

  return {
    webQuery: webQuery || claimText.slice(0, 80),
    wikiQuery: wikiKeywords || words.slice(0, 5).join(" "),
    entities,
  };
}

/**
 * Score how relevant a source is to a claim (0.0 to 1.0).
 * Uses word overlap between claim and source title+snippet.
 */
function scoreRelevance(claimText: string, source: ClaimSource): number {
  const claimWords = new Set(
    claimText.toLowerCase().replace(/["""''(),;:!?.]/g, " ").split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  );
  const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
  const sourceWords = new Set(
    sourceText.replace(/["""''(),;:!?.]/g, " ").split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  );

  if (claimWords.size === 0) return 0;

  // Count overlapping meaningful words
  let overlap = 0;
  for (const word of claimWords) {
    if (sourceWords.has(word)) overlap++;
    // Also check partial matches (e.g., "laptop" matches "laptops")
    else {
      for (const sw of sourceWords) {
        if ((sw.startsWith(word) || word.startsWith(sw)) && Math.abs(sw.length - word.length) <= 2) {
          overlap += 0.7;
          break;
        }
      }
    }
  }

  return Math.min(1, overlap / Math.max(3, claimWords.size));
}

export async function findEvidence(
  claim: ExtractedClaim,
  language: string = "en",
): Promise<ClaimSource[]> {
  const sources: ClaimSource[] = [];

  // Extract focused search queries instead of using raw claim text
  const { webQuery, wikiQuery } = extractSearchQuery(claim.claim_text);

  // Run all evidence sources in parallel with per-source timeout fallbacks
  const [wikiResults, wikidataResults, groundedResults, ragResults] = await Promise.all([
    withFallback(searchWikipedia(wikiQuery, language), 6000, []),
    withFallback(searchWikidata(wikiQuery), 6000, []),
    withFallback(searchGrounded(claim), 12000, []),
    withFallback(retrieveKnowledge(claim.claim_text, { limit: 5 }).catch(() => []), 5000, []),
  ]);

  // Add RAG knowledge base results first (highest relevance)
  const ragSources = knowledgeToSources(ragResults);
  sources.push(...ragSources);

  sources.push(...wikiResults, ...wikidataResults);

  // Deduplicate by URL before adding grounded results
  const existingUrls = new Set(sources.map((s) => s.url));
  for (const result of groundedResults) {
    if (!existingUrls.has(result.url)) {
      sources.push(result);
      existingUrls.add(result.url);
    }
  }

  // Serper uses the web-optimized query (Google handles natural language well)
  // Always call Serper — it provides the most topically relevant results
  {
    const webResults = await withFallback(searchWeb(webQuery), 6000, []);
    for (const result of webResults) {
      if (!existingUrls.has(result.url)) {
        sources.push(result);
        existingUrls.add(result.url);
      }
    }
  }

  // ── Relevance filtering ──
  // Score each source and remove clearly irrelevant ones (< 0.1 overlap)
  // Sort by relevance so the most relevant sources are shown first
  const scored = sources.map(s => ({
    source: s,
    relevance: scoreRelevance(claim.claim_text, s),
  }));

  // Keep sources with at least minimal relevance (>= 0.1)
  // But always keep at least 2 sources if any exist (for the AI to work with)
  scored.sort((a, b) => b.relevance - a.relevance);
  const minSources = Math.min(2, scored.length);
  const filtered = scored.filter((s, i) => i < minSources || s.relevance >= 0.1);

  return filtered.map(s => s.source).slice(0, 10);
}
