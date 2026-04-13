import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasScope, checkApiKeyRateLimit } from "@/lib/security/api-key-auth";
import { sanitizeClaim } from "@/lib/security/sanitize";
import { judgeClaim, TokenTracker } from "@/lib/ai/gemini";
import { findEvidence } from "@/lib/evidence/search";
import { crossReferenceValidation } from "@/lib/evidence/cross-reference";
import { detectHallucinations } from "@/lib/nlp/hallucination-detector";
import { z } from "zod/v4";

export const maxDuration = 60;

const judgeSchema = z.object({
  claim: z.object({
    claim_text: z.string().min(1),
    original_sentence: z.string().optional().default(""),
    position_start: z.number().optional().default(0),
    position_end: z.number().optional().default(0),
  }),
  language: z.string().optional().default("en"),
});

/**
 * Phase 2: Judge a single claim — find evidence + verdict.
 * Called once per claim. Designed to be fast (~10-15s per claim).
 * Extension fires multiple of these in parallel.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const apiKeyAuth = await authenticateApiKey(authHeader);

  if (!apiKeyAuth) {
    return corsResponse({ error: "API key required" }, 401);
  }
  if (!hasScope(apiKeyAuth, "verify")) {
    return corsResponse({ error: "API key does not have 'verify' scope" }, 403);
  }

  // Lighter rate limiting for claim endpoints (each claim is one call)
  const keyRateCheck = checkApiKeyRateLimit(apiKeyAuth.keyId, apiKeyAuth.rateLimitPerMinute * 3);
  if (!keyRateCheck.allowed) {
    const retryAfterSec = Math.ceil(keyRateCheck.retryAfterMs / 1000);
    return corsResponse({ error: "Rate limit exceeded", retryAfter: retryAfterSec }, 429, {
      "Retry-After": String(retryAfterSec),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsResponse({ error: "Invalid JSON" }, 400);
  }

  const parsed = judgeSchema.safeParse(body);
  if (!parsed.success) {
    return corsResponse({ error: "Provide a claim object with claim_text" }, 400);
  }

  const { claim, language } = parsed.data;

  try {
    const tracker = new TokenTracker();

    // Sanitize claim text
    const sanitizedClaim = {
      ...claim,
      claim_text: sanitizeClaim(claim.claim_text),
    };

    // Find evidence — fast mode (skip grounded search, tighter timeouts)
    const sources = await findEvidence(sanitizedClaim, language, { fast: true });

    // Judge the claim
    const judgment = await judgeClaim(sanitizedClaim, sources, language, tracker, {
      timeoutMs: 15000,
    });

    // Cross-reference and hallucination checks (instant, NLP-based)
    const crossRef = crossReferenceValidation(sanitizedClaim.claim_text, sources);
    const hallucinationCheck = detectHallucinations(sanitizedClaim.claim_text, sources);

    // Adjust confidence
    let adjustedConfidence = judgment.confidence;
    if (crossRef.sourceConsensus === "strong") {
      adjustedConfidence = Math.min(1, adjustedConfidence + 0.1);
    } else if (crossRef.sourceConsensus === "none") {
      adjustedConfidence = Math.max(0, adjustedConfidence - 0.1);
    }
    if (hallucinationCheck.riskLevel === "critical") {
      adjustedConfidence = Math.max(0, adjustedConfidence - 0.2);
    } else if (hallucinationCheck.riskLevel === "high") {
      adjustedConfidence = Math.max(0, adjustedConfidence - 0.1);
    }

    // Filter sources to only include those the AI actually referenced in its reasoning
    // This prevents showing irrelevant search results (e.g. "Lufthansa" for a laptop repair claim)
    const reasoning = (judgment.reasoning || "").toLowerCase();
    const relevantSources = judgment.sources.filter((s, i) => {
      // Keep source if the AI mentioned it by index ("Source 1", "Source 2" etc.)
      if (reasoning.includes(`source ${i + 1}`)) return true;
      // Keep source if a significant title word (>5 chars, not generic) appears in the reasoning
      const titleWords = s.title.toLowerCase().split(/\s+/).filter(w => w.length > 5);
      if (titleWords.some(w => reasoning.includes(w))) return true;
      // Keep source if the domain name appears in the reasoning
      try {
        const domain = new URL(s.url).hostname.replace("www.", "").split(".")[0];
        if (domain.length > 4 && reasoning.includes(domain)) return true;
      } catch { /* invalid URL */ }
      return false;
    });

    // If filter removed everything but we have a non-unverifiable verdict, keep top 3 by relevance
    const finalSources = relevantSources.length > 0 ? relevantSources : judgment.sources.slice(0, 3);

    return corsResponse({
      claim_text: sanitizedClaim.claim_text,
      original_sentence: sanitizedClaim.original_sentence,
      verdict: judgment.verdict,
      confidence: Math.round(adjustedConfidence * 100) / 100,
      reasoning: judgment.reasoning,
      recommendation: judgment.recommendation,
      sources: finalSources.map(s => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        source_type: s.source_type,
        credibility_score: s.credibility_score,
      })),
      position_start: sanitizedClaim.position_start,
      position_end: sanitizedClaim.position_end,
    }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Judgment failed";
    const isQuota = message.includes("quota") || message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
    const isTimeout = message.includes("timed out") || message.includes("timeout");
    return corsResponse(
      { error: message, error_code: isQuota ? "quota_exceeded" : isTimeout ? "timeout" : "judge_failed" },
      isQuota ? 429 : isTimeout ? 504 : 500
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function corsResponse(body: Record<string, unknown>, status: number, extra?: Record<string, string>): NextResponse {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(), ...extra } });
}
