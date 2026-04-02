import type { ClaimSource, ExtractedClaim } from "@/types";
import { searchWikipedia, searchWikidata } from "./wikipedia";
import { searchWeb } from "./serper";
import { searchGrounded } from "./grounded-search";

export async function findEvidence(
  claim: ExtractedClaim,
  language: string = "en"
): Promise<ClaimSource[]> {
  const sources: ClaimSource[] = [];
  const query = claim.claim_text;

  // Step 1: Search Wikipedia + Wikidata (primary, free, high-credibility)
  const [wikiResults, wikidataResults] = await Promise.all([
    searchWikipedia(query, language),
    searchWikidata(query),
  ]);

  sources.push(...wikiResults, ...wikidataResults);

  // Step 2: Google Search grounding via Gemini (advanced RAG with real-time web)
  // This provides structured citations from Google Search
  const groundedResults = await searchGrounded(claim);
  
  // Deduplicate by URL before adding grounded results
  const existingUrls = new Set(sources.map((s) => s.url));
  for (const result of groundedResults) {
    if (!existingUrls.has(result.url)) {
      sources.push(result);
      existingUrls.add(result.url);
    }
  }

  // Step 3: Serper fallback if still fewer than 3 diverse sources
  if (sources.length < 3) {
    const webResults = await searchWeb(query);
    for (const result of webResults) {
      if (!existingUrls.has(result.url)) {
        sources.push(result);
        existingUrls.add(result.url);
      }
    }
  }

  // Limit to 7 sources max (increased from 5 for better cross-referencing)
  return sources.slice(0, 7);
}
