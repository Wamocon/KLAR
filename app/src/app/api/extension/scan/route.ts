import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasScope, checkApiKeyRateLimit } from "@/lib/security/api-key-auth";
import { sanitizeInput } from "@/lib/security/sanitize";
import { runVerificationPipeline } from "@/lib/verification/pipeline";
import { z } from "zod/v4";
import type { AnalysisMode } from "@/types";

export const maxDuration = 60;

// Lazy import for heavy jsdom dependency
const getExtractUrlContent = () => import("@/lib/utils/extract-url").then(m => m.extractUrlContent);

const scanSchema = z.object({
  text: z.string().min(50).max(50000).optional(),
  url: z.string().url().optional(),
  language: z.string().optional().default("en"),
  analyses: z.array(z.enum([
    "fact-check", "bias-check", "ai-detection", "plagiarism", "framework-eval", "comprehensive",
  ])).optional().default(["fact-check"]),
}).refine(
  (data) => data.text || data.url,
  { message: "Provide either text or url" }
);

/**
 * POST: Lightweight verification for browser extensions.
 *
 * Returns JSON directly (no SSE streaming) for simpler client integration.
 * Requires API key with "verify" scope.
 * Lower character limit (5000) for extension use.
 *
 * CORS headers included for extension context.
 */
export async function POST(request: NextRequest) {
  // API key auth only
  const authHeader = request.headers.get("authorization");
  const apiKeyAuth = await authenticateApiKey(authHeader);

  if (!apiKeyAuth) {
    return corsResponse({ error: "API key required. Use Authorization: Bearer klar_..." }, 401);
  }

  if (!hasScope(apiKeyAuth, "verify")) {
    return corsResponse({ error: "API key does not have 'verify' scope" }, 403);
  }

  const keyRateCheck = checkApiKeyRateLimit(apiKeyAuth.keyId, apiKeyAuth.rateLimitPerMinute);
  if (!keyRateCheck.allowed) {
    const retryAfterSec = Math.ceil(keyRateCheck.retryAfterMs / 1000);
    return corsResponse(
      { error: "Rate limit exceeded", retryAfter: retryAfterSec },
      429,
      { "Retry-After": String(retryAfterSec) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsResponse({ error: "Invalid JSON" }, 400);
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return corsResponse({ error: "Provide text (50+ chars) or a valid URL" }, 400);
  }

  let text: string;
  let sourceUrl: string | null = null;
  let sourceTitle: string | null = null;

  if (parsed.data.url) {
    try {
      const extractUrlContent = await getExtractUrlContent();
      const page = await extractUrlContent(parsed.data.url);
      text = page.content.slice(0, 5000); // Truncate aggressively for extension — 5K is enough for meaningful analysis
      sourceUrl = page.url;
      sourceTitle = page.title;
    } catch (err) {
      return corsResponse(
        { error: err instanceof Error ? err.message : "Failed to fetch URL", error_code: "url_fetch_failed" },
        400
      );
    }
  } else {
    // For full-page captures from the extension, truncate to 5K to stay within time budget
    text = parsed.data.text!.slice(0, 5000);
  }

  // Sanitize
  try {
    text = sanitizeInput(text);
  } catch (err) {
    return corsResponse(
      { error: err instanceof Error ? err.message : "Invalid content" },
      400
    );
  }

  // Run verification (non-streaming, collect all events including analysis-specific)
  try {
    let result: Record<string, unknown> | null = null;
    let claims: Record<string, unknown>[] = [];
    let biasAnalysis: Record<string, unknown> | null = null;
    let aiDetection: Record<string, unknown> | null = null;
    let plagiarismCheck: Record<string, unknown> | null = null;
    let frameworkEvaluation: Record<string, unknown> | null = null;
    let pipelineError: string | null = null;

    for await (const event of runVerificationPipeline(
      text,
      parsed.data.language,
      parsed.data.analyses as AnalysisMode[],
      { maxClaims: 3, batchSize: 3, deadlineMs: 50000, fast: true }
    )) {
      if (event.type === "completed") {
        const completedEvent = event as unknown as {
          type: string;
          verification: Record<string, unknown>;
          claims: Record<string, unknown>[];
        };
        result = completedEvent.verification;
        claims = completedEvent.claims;
      } else if (event.type === "error") {
        pipelineError = (event as unknown as { message: string }).message;
      } else if (event.type === "bias_analysis") {
        biasAnalysis = (event as unknown as { result: Record<string, unknown> }).result;
      } else if (event.type === "ai_detection") {
        aiDetection = (event as unknown as { result: Record<string, unknown> }).result;
      } else if (event.type === "plagiarism_check") {
        plagiarismCheck = (event as unknown as { result: Record<string, unknown> }).result;
      } else if (event.type === "framework_evaluation") {
        frameworkEvaluation = (event as unknown as { result: Record<string, unknown> }).result;
      }
    }

    // Even without fact-check claims, return analysis-only results if available
    if (!result && (biasAnalysis || aiDetection || plagiarismCheck || frameworkEvaluation)) {
      return corsResponse({
        trust_score: 0,
        total_claims: 0,
        supported: 0,
        contradicted: 0,
        unverifiable: 0,
        processing_time_ms: 0,
        language: parsed.data.language,
        source_url: sourceUrl,
        source_title: sourceTitle,
        claims: [],
        ...(biasAnalysis && { bias: biasAnalysis }),
        ...(aiDetection && { ai_detection: aiDetection }),
        ...(plagiarismCheck && { plagiarism: plagiarismCheck }),
        ...(frameworkEvaluation && { framework: frameworkEvaluation }),
      }, 200);
    }

    if (!result) {
      // Provide a machine-readable error code alongside the message for better client handling
      const isNoClaims = pipelineError?.includes("No factual claims");
      const isTimeout = pipelineError?.includes("timed out");
      const isExtraction = pipelineError?.includes("extract") || pipelineError?.includes("parse");
      return corsResponse(
        {
          error: pipelineError || "Verification failed — no claims could be extracted from this text",
          error_code: isNoClaims ? "no_claims" : isTimeout ? "timeout" : isExtraction ? "extraction_failed" : "pipeline_error",
        },
        isNoClaims ? 422 : isTimeout ? 504 : 500
      );
    }

    return corsResponse({
      trust_score: result.trust_score,
      total_claims: result.total_claims,
      supported: result.supported_count,
      contradicted: result.contradicted_count,
      unverifiable: result.unverifiable_count,
      processing_time_ms: result.processing_time_ms,
      language: result.language,
      source_url: sourceUrl,
      source_title: sourceTitle,
      claims: claims.map((c) => ({
        text: c.claim_text,
        verdict: c.verdict,
        confidence: c.confidence,
        reasoning: c.reasoning,
        sources: c.sources,
      })),
      // Analysis-specific results (only included when requested)
      ...(biasAnalysis && { bias: biasAnalysis }),
      ...(aiDetection && { ai_detection: aiDetection }),
      ...(plagiarismCheck && { plagiarism: plagiarismCheck }),
      ...(frameworkEvaluation && { framework: frameworkEvaluation }),
    }, 200);
  } catch (err) {
    return corsResponse(
      { error: err instanceof Error ? err.message : "Verification failed" },
      500
    );
  }
}

// OPTIONS: CORS preflight for extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function corsResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...corsHeaders(), ...extraHeaders },
  });
}
