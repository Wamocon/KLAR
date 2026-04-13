import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasScope, checkApiKeyRateLimit } from "@/lib/security/api-key-auth";
import { sanitizeInput } from "@/lib/security/sanitize";
import { extractClaims, TokenTracker } from "@/lib/ai/gemini";
import { detectBias } from "@/lib/analysis/bias-detector";
import { detectAIContent } from "@/lib/analysis/ai-detector";
import { detectPlagiarism } from "@/lib/analysis/plagiarism-detector";
import { z } from "zod/v4";

export const maxDuration = 60;

const getExtractUrlContent = () => import("@/lib/utils/extract-url").then(m => m.extractUrlContent);

const extractSchema = z.object({
  text: z.string().min(50).max(100000).optional(),
  url: z.string().url().optional(),
  language: z.string().optional().default("en"),
  analyses: z.array(z.enum([
    "fact-check", "bias-check", "ai-detection", "plagiarism", "comprehensive",
  ])).optional().default(["fact-check"]),
}).refine(
  (data) => data.text || data.url,
  { message: "Provide either text or url" }
);

/**
 * Phase 1: Extract claims + run NLP analyses.
 * Returns claims array and optional analysis results.
 * Designed to be fast (~10-15s) — no evidence search or judgment.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const apiKeyAuth = await authenticateApiKey(authHeader);

  if (!apiKeyAuth) {
    return corsResponse({ error: "API key required" }, 401);
  }
  if (apiKeyAuth && !hasScope(apiKeyAuth, "verify")) {
    return corsResponse({ error: "API key does not have 'verify' scope" }, 403);
  }

  if (apiKeyAuth) {
    const keyRateCheck = checkApiKeyRateLimit(apiKeyAuth.keyId, apiKeyAuth.rateLimitPerMinute);
    if (!keyRateCheck.allowed) {
      const retryAfterSec = Math.ceil(keyRateCheck.retryAfterMs / 1000);
      return corsResponse({ error: "Rate limit exceeded", retryAfter: retryAfterSec }, 429, {
        "Retry-After": String(retryAfterSec),
      });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsResponse({ error: "Invalid JSON" }, 400);
  }

  const parsed = extractSchema.safeParse(body);
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
      text = page.content;
      sourceUrl = page.url;
      sourceTitle = page.title;
    } catch (err) {
      return corsResponse(
        { error: err instanceof Error ? err.message : "Failed to fetch URL", error_code: "url_fetch_failed" },
        400
      );
    }
  } else {
    text = parsed.data.text!;
  }

  try {
    text = sanitizeInput(text);
  } catch (err) {
    return corsResponse({ error: err instanceof Error ? err.message : "Invalid content" }, 400);
  }

  // Truncate for AI extraction — 10K chars is plenty for claim extraction with thinkingBudget:0
  const textForAI = text.slice(0, 10000);
  const analyses = parsed.data.analyses!;
  const isComprehensive = analyses.includes("comprehensive");
  const language = parsed.data.language!;

  try {
    const tracker = new TokenTracker();

    // Extract claims (the only AI call in this phase — ~10-20s for up to 8K text)
    const claims = await extractClaims(textForAI, language, tracker, {
      maxClaims: 8,
      timeoutMs: 40000,
    });

    // NLP analyses run on text directly — fast, no AI calls
    const result: Record<string, unknown> = {
      claims,
      source_url: sourceUrl,
      source_title: sourceTitle,
      language,
      text_length: text.length,
    };

    if (isComprehensive || analyses.includes("ai-detection")) {
      result.ai_detection = detectAIContent(text);
    }
    if (isComprehensive || analyses.includes("bias-check")) {
      result.bias = detectBias(text);
    }
    if (isComprehensive || analyses.includes("plagiarism")) {
      result.plagiarism = detectPlagiarism(text, []);
    }

    return corsResponse(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    const isQuota = message.includes("quota") || message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
    const isTimeout = message.includes("timed out") || message.includes("timeout");
    return corsResponse(
      { error: message, error_code: isQuota ? "quota_exceeded" : isTimeout ? "timeout" : "extraction_failed" },
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
