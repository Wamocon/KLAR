import type { ClaimSource, ExtractedClaim } from "@/types";
import { groundedFactCheck } from "@/lib/ai/gemini";

/**
 * Grounded Search Module
 *
 * Uses Gemini's native Google Search grounding tool to get real-time
 * fact-checking evidence with structured citations. This replaces/augments
 * the traditional Wikipedia + Serper pipeline with Google's advanced RAG
 * that provides:
 *
 * 1. Automatic search query generation
 * 2. Real-time web search
 * 3. Source citation with URL mapping
 * 4. AI-synthesized evidence summaries
 */

/**
 * Search for evidence using Gemini's Google Search grounding.
 * Returns structured sources with citations from the web.
 */
export async function searchGrounded(
  claim: ExtractedClaim
): Promise<ClaimSource[]> {
  try {
    const result = await groundedFactCheck(claim.claim_text);
    return result.sources.slice(0, 5);
  } catch {
    return [];
  }
}
