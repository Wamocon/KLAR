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

export interface FindEvidenceOptions {
  /** Skip grounded search (saves ~12s Gemini call) */
  fast?: boolean;
}

export async function findEvidence(
  claim: ExtractedClaim,
  language: string = "en",
  options?: FindEvidenceOptions
): Promise<ClaimSource[]> {
  const sources: ClaimSource[] = [];
  const query = claim.claim_text;
  const fast = options?.fast ?? false;

  // Run all evidence sources in parallel with per-source timeout fallbacks
  // In fast mode, skip grounded search (another Gemini call, ~12s) — rely on Wikipedia + Serper
  const [wikiResults, wikidataResults, groundedResults, ragResults] = await Promise.all([
    withFallback(searchWikipedia(query, language), fast ? 4000 : 6000, []),
    withFallback(searchWikidata(query), fast ? 4000 : 6000, []),
    fast ? Promise.resolve([]) : withFallback(searchGrounded(claim), 12000, []),
    withFallback(retrieveKnowledge(query, { limit: 5 }).catch(() => []), fast ? 3000 : 5000, []),
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

  // Serper fallback if still fewer than 3 diverse sources (always try in fast mode since grounded is skipped)
  if (sources.length < 3 || fast) {
    const webResults = await withFallback(searchWeb(query), fast ? 4000 : 6000, []);
    for (const result of webResults) {
      if (!existingUrls.has(result.url)) {
        sources.push(result);
        existingUrls.add(result.url);
      }
    }
  }

  // Limit to 10 sources max (increased for knowledge base)
  return sources.slice(0, 10);
}
