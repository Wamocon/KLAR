import type { ClaimSource, ExtractedClaim } from "@/types";
import { searchWikipedia, searchWikidata } from "./wikipedia";
import { searchWeb } from "./serper";
import { searchGrounded } from "./grounded-search";
import { retrieveKnowledge, knowledgeToSources } from "@/lib/rag/retrieval";

export async function findEvidence(
  claim: ExtractedClaim,
  language: string = "en"
): Promise<ClaimSource[]> {
  const sources: ClaimSource[] = [];
  const query = claim.claim_text;

  // Run all evidence sources in parallel for speed — including RAG knowledge base
  const [wikiResults, wikidataResults, groundedResults, ragResults] = await Promise.all([
    searchWikipedia(query, language),
    searchWikidata(query),
    searchGrounded(claim),
    retrieveKnowledge(query, { limit: 5 }).catch(() => []),
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

  // Serper fallback if still fewer than 3 diverse sources
  if (sources.length < 3) {
    const webResults = await searchWeb(query);
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
