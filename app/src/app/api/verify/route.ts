import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runVerificationPipeline } from "@/lib/verification/pipeline";

// Allow up to 60s for AI processing (Gemini calls + evidence search)
export const maxDuration = 60;

// Lazy imports for heavy dependencies (jsdom ~20MB, pdf-parse) — only loaded when needed
const getExtractUrlContent = () => import("@/lib/utils/extract-url").then(m => m.extractUrlContent);
const getExtractTextFromFile = () => import("@/lib/utils/file-extract").then(m => m.extractTextFromFile);
import { sanitizeInput } from "@/lib/security/sanitize";
import { detectAdversarialContent, getOverallThreatLevel } from "@/lib/security/adversarial";
import {
  PLAN_CONFIGS,
  calculateRequestCost,
  checkBurstLimit,
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  checkAnonymousQuota,
  isAbusiveIP,
  recordViolation,
  filterAllowedModes,
  checkCharLimit,
  checkFileLimit,
} from "@/lib/security/rate-limiter";
import { authenticateApiKey, hasScope, checkApiKeyRateLimit } from "@/lib/security/api-key-auth";
import type { ApiKeyAuth } from "@/lib/security/api-key-auth";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { z } from "zod/v4";
import type { AnalysisMode, UserPlan } from "@/types";

const analysisModeSchema = z.enum([
  "fact-check", "bias-check", "ai-detection", "plagiarism", "framework-eval", "comprehensive",
]);

const verifySchema = z.union([
  z.object({
    text: z.string().min(50).max(10000),
    language: z.string().optional().default("en"),
    mode: z.literal("text").optional().default("text"),
    analyses: z.array(analysisModeSchema).optional().default(["fact-check"]),
  }),
  z.object({
    url: z.string().url(),
    language: z.string().optional().default("en"),
    mode: z.literal("url"),
    analyses: z.array(analysisModeSchema).optional().default(["fact-check"]),
  }),
]);

// GET: Fetch a verification report
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid verification ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Auth check: verify ownership or allow anonymous access to their own reports
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  const { data: verification, error: vError } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();

  if (vError || !verification) {
    return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  }

  // Access control: owner can always access, public reports are accessible to anyone
  // Anonymous reports (user_id is null) are accessible to anyone with the ID
  if (verification.user_id && (!user || user.id !== verification.user_id)) {
    if (!verification.is_public) {
      return NextResponse.json({ error: "Verification not found" }, { status: 404 });
    }
  }

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("verification_id", id)
    .order("position_start", { ascending: true });

  return NextResponse.json({
    verification,
    claims: claims || [],
  });
}

// POST: Run verification pipeline with streaming
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let text: string;
  let language = "en";
  let sourceUrl: string | null = null;
  let sourceTitle: string | null = null;
  let analyses: AnalysisMode[] = ["fact-check"];
  let fileFilename: string | null = null;
  let fileSize = 0;

  // ── Parse input: supports JSON or multipart (file upload) ──

  if (contentType.includes("multipart/form-data")) {
    // File upload mode
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    language = (formData.get("language") as string) || "en";

    const rawAnalyses = formData.get("analyses") as string;
    if (rawAnalyses) {
      try {
        const parsed = JSON.parse(rawAnalyses);
        if (Array.isArray(parsed)) analyses = parsed as AnalysisMode[];
      } catch { /* use default */ }
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Hard limit: 10 MB (plan-specific limits enforced after auth)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
    }

    fileSize = file.size;

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const extractTextFromFile = await getExtractTextFromFile();
      const extracted = await extractTextFromFile(buffer, file.name, file.type);
      text = extracted.text;
      fileFilename = file.name;

      if (text.length < 50) {
        return NextResponse.json(
          { error: "Extracted text is too short to analyze. The file may be empty or contain mainly images." },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to extract file content" },
        { status: 400 }
      );
    }
  } else {
    // JSON mode (text or URL)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Provide 'text' (50–10,000 chars) or a valid 'url'." },
        { status: 400 }
      );
    }

    const input = parsed.data;
    language = input.language;
    analyses = input.analyses as AnalysisMode[];

    if ("url" in input && input.url) {
      try {
        const extractUrlContent = await getExtractUrlContent();
        const page = await extractUrlContent(input.url);
        text = page.content;
        sourceUrl = page.url;
        sourceTitle = page.title;

        if (text.length < 50) {
          return NextResponse.json(
            { error: "The extracted content is too short to verify. The page may be behind a paywall or login." },
            { status: 400 }
          );
        }
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to fetch URL content" },
          { status: 400 }
        );
      }
    } else if ("text" in input) {
      text = input.text;
    } else {
      return NextResponse.json({ error: "No text or URL provided" }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // ── Layer 0: Abuse Detection — block known abusive IPs ──
  if (isAbusiveIP(clientIP)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  // ── Layer 1: Authentication & Plan Resolution (Session OR API Key) ──
  let apiKeyAuth: ApiKeyAuth | null = null;
  const authHeader = request.headers.get("authorization");

  // Try API key auth first (for programmatic/extension access)
  if (authHeader?.startsWith("Bearer klar_")) {
    apiKeyAuth = await authenticateApiKey(authHeader);
    if (!apiKeyAuth) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }
    if (!hasScope(apiKeyAuth, "verify")) {
      return NextResponse.json(
        { error: "API key does not have 'verify' scope" },
        { status: 403 }
      );
    }
    // Per-key rate limit
    const keyRateCheck = checkApiKeyRateLimit(apiKeyAuth.keyId, apiKeyAuth.rateLimitPerMinute);
    if (!keyRateCheck.allowed) {
      const retryAfterSec = Math.ceil(keyRateCheck.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "API key rate limit exceeded", retryAfter: retryAfterSec },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }
  }

  const {
    data: { user },
  } = apiKeyAuth
    ? { data: { user: { id: apiKeyAuth.userId } as { id: string } } }
    : await supabase.auth.getUser();

  let plan: UserPlan | "guest" = apiKeyAuth ? apiKeyAuth.plan : "guest";
  let monthlyUsed = 0;
  let monthlyResetAt: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  if (user && !apiKeyAuth) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_verification_count, monthly_reset_at, plan")
      .eq("id", user.id)
      .single();

    if (profile) {
      plan = (profile.plan as UserPlan) || "free";
      const resetAt = new Date(profile.monthly_reset_at);
      const now = new Date();
      monthlyUsed = now > resetAt ? 0 : profile.monthly_verification_count;
      monthlyResetAt = resetAt;
    }
  } else if (apiKeyAuth) {
    // For API key auth, still check monthly usage from profile
    const supabaseAdmin = await createServiceClient();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("monthly_verification_count, monthly_reset_at")
      .eq("id", apiKeyAuth.userId)
      .single();

    if (profile) {
      const resetAt = new Date(profile.monthly_reset_at);
      const now = new Date();
      monthlyUsed = now > resetAt ? 0 : profile.monthly_verification_count;
      monthlyResetAt = resetAt;
    }
  }

  const rateLimitKey = apiKeyAuth
    ? `apikey:${apiKeyAuth.keyId}`
    : user ? `user:${user.id}` : `ip:${clientIP}`;

  // ── Layer 2: Burst Protection (per-minute / per-hour sliding window) ──
  const burstCheck = checkBurstLimit(rateLimitKey, plan);
  if (!burstCheck.allowed) {
    recordViolation(clientIP);
    const retryAfterSec = Math.ceil(burstCheck.retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please slow down.", retryAfter: retryAfterSec },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  // ── Layer 3: Concurrency Guard ──
  if (!acquireConcurrencySlot(rateLimitKey, plan)) {
    return NextResponse.json(
      { error: "A verification is already in progress. Please wait for it to complete." },
      { status: 429 }
    );
  }

  // ── Layer 4: Filter Analysis Modes by Plan ──
  const { filtered: allowedAnalyses, blocked: blockedModes } = filterAllowedModes(analyses, plan);
  analyses = allowedAnalyses;

  // ── Layer 5: Cost-Weighted Monthly Quota ──
  const requestCost = calculateRequestCost(analyses, plan);
  const monthlyLimit = PLAN_CONFIGS[plan].monthlyLimit;

  if (user) {
    if (monthlyUsed + requestCost > monthlyLimit) {
      releaseConcurrencySlot(rateLimitKey);
      return NextResponse.json(
        {
          error: "Monthly verification limit reached. Upgrade your plan for more verifications.",
          usage: { used: monthlyUsed, limit: monthlyLimit, remaining: Math.max(0, monthlyLimit - monthlyUsed), plan, resetAt: monthlyResetAt.toISOString() },
        },
        { status: 429 }
      );
    }
  } else {
    // Anonymous quota check
    const anonCheck = checkAnonymousQuota(clientIP, requestCost);
    if (!anonCheck.allowed) {
      releaseConcurrencySlot(rateLimitKey);
      recordViolation(clientIP);
      return NextResponse.json(
        {
          error: "Guest verification limit reached. Sign up for free to get 10 verifications per month.",
          usage: { used: PLAN_CONFIGS.guest.monthlyLimit - anonCheck.remaining, limit: PLAN_CONFIGS.guest.monthlyLimit, remaining: anonCheck.remaining, plan: "guest", resetAt: anonCheck.resetAt.toISOString() },
        },
        { status: 429 }
      );
    }
  }

  // ── Layer 6: Plan-Based Input Limits ──
  if (!checkCharLimit(text.length, plan)) {
    releaseConcurrencySlot(rateLimitKey);
    const maxChars = PLAN_CONFIGS[plan].maxChars;
    return NextResponse.json(
      { error: `Text exceeds the ${maxChars.toLocaleString()} character limit for your plan. Upgrade for higher limits.` },
      { status: 400 }
    );
  }

  if (fileSize > 0) {
    const fileSizeCheck = checkFileLimit(fileSize, plan);
    if (!fileSizeCheck.allowed) {
      releaseConcurrencySlot(rateLimitKey);
      const maxMB = Math.round(fileSizeCheck.maxSize / (1024 * 1024));
      const msg = fileSizeCheck.maxSize === 0
        ? "File uploads are not available on the guest plan. Sign up for free to upload files."
        : `File exceeds the ${maxMB} MB limit for your plan. Upgrade for larger file support.`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // Sanitize input against prompt injection
  try {
    text = sanitizeInput(text);
  } catch (err) {
    releaseConcurrencySlot(rateLimitKey);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid input content" },
      { status: 400 }
    );
  }

  // Adversarial content detection
  const adversarialDetections = detectAdversarialContent(text);
  const threatLevel = getOverallThreatLevel(adversarialDetections);

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send usage info and plan restrictions upfront
      sendEvent({
        type: "usage_info",
        plan,
        used: user ? monthlyUsed : (PLAN_CONFIGS.guest.monthlyLimit - (PLAN_CONFIGS.guest.monthlyLimit)),
        limit: monthlyLimit,
        cost: requestCost,
        analyses,
        blockedModes: blockedModes.length > 0 ? blockedModes : undefined,
      });

      // If file mode, send the extracted metadata
      if (fileFilename) {
        sendEvent({
          type: "file_extracted",
          filename: fileFilename,
          wordCount: text.split(/\s+/).length,
        });
      }

      // If URL mode, send the extracted metadata first
      if (sourceUrl) {
        sendEvent({
          type: "url_extracted",
          url: sourceUrl,
          title: sourceTitle,
          contentLength: text.length,
        });
      }

      // Send adversarial detection results if any
      if (adversarialDetections.length > 0) {
        sendEvent({
          type: "adversarial_detected",
          threatLevel: threatLevel.level,
          threatScore: threatLevel.score,
          detections: adversarialDetections.map((d) => ({
            type: d.type,
            severity: d.severity,
            confidence: d.confidence,
          })),
        });
      }

      try {
        let verificationId = "";
        
        for await (const event of runVerificationPipeline(text, language, analyses)) {
          if (event.type === "completed") {
            // Store in database
            const { data: savedVerification, error: saveError } = await supabase
              .from("verifications")
              .insert({
                user_id: user?.id || null,
                org_id: apiKeyAuth?.orgId || null,
                api_key_id: apiKeyAuth?.keyId || null,
                input_text: text,
                source_url: sourceUrl,
                source_title: sourceTitle,
                language: event.verification.language,
                total_claims: event.verification.total_claims,
                supported_count: event.verification.supported_count,
                unverifiable_count: event.verification.unverifiable_count,
                contradicted_count: event.verification.contradicted_count,
                trust_score: event.verification.trust_score,
                status: "completed",
                processing_time_ms: event.verification.processing_time_ms,
              })
              .select("id")
              .single();

            if (saveError || !savedVerification) {
              sendEvent({ type: "error", message: "Failed to save verification" });
              controller.close();
              return;
            }

            verificationId = savedVerification.id;

            // Save claims
            if (event.claims.length > 0) {
              const claimsToInsert = event.claims.map((c) => ({
                verification_id: verificationId,
                claim_text: c.claim_text,
                original_sentence: c.original_sentence,
                verdict: c.verdict,
                confidence: c.confidence,
                reasoning: c.reasoning,
                sources: c.sources,
                position_start: c.position_start,
                position_end: c.position_end,
              }));

              await supabase.from("claims").insert(claimsToInsert);
            }

            // Update monthly count (cost-weighted)
            if (user) {
              // For cost > 1, we call increment_monthly_count multiple times
              // or use a custom RPC. For now, loop is safe since max cost is ~3.
              for (let i = 0; i < Math.ceil(requestCost); i++) {
                await supabase.rpc("increment_monthly_count", {
                  user_id_input: user.id,
                });
              }
            }

            // Log audit entry
            await supabase.from("audit_log").insert({
              user_id: user?.id || null,
              action: "verification_completed",
              entity_type: "verification",
              entity_id: verificationId,
              metadata: {
                total_claims: event.verification.total_claims,
                trust_score: event.verification.trust_score,
                source_url: sourceUrl,
                mode: fileFilename ? "file" : sourceUrl ? "url" : "text",
                analyses,
                filename: fileFilename,
                plan,
                cost: requestCost,
              },
              ip_address: clientIP,
            });

            // Store adversarial detections if any
            if (adversarialDetections.length > 0 && verificationId) {
              const detectionsToInsert = adversarialDetections.map((d) => ({
                verification_id: verificationId,
                detection_type: d.type,
                severity: d.severity,
                confidence: d.confidence,
                details: d.details,
              }));
              const adminClient = await createServiceClient();
              await adminClient.from("adversarial_detections").insert(detectionsToInsert);
            }

            // Dispatch webhook if verification was done via API key (org context)
            if (apiKeyAuth?.orgId && verificationId) {
              dispatchWebhook(apiKeyAuth.orgId, "verification.completed", {
                verification_id: verificationId,
                trust_score: event.verification.trust_score,
                total_claims: event.verification.total_claims,
                supported: event.verification.supported_count,
                contradicted: event.verification.contradicted_count,
                processing_time_ms: event.verification.processing_time_ms,
              }).catch(() => { /* fire-and-forget */ });
            }

            sendEvent({
              type: "completed",
              verification: {
                ...event.verification,
                id: verificationId,
                source_url: sourceUrl,
                source_title: sourceTitle,
              },
              claims: event.claims,
            });
          } else {
            sendEvent(event);
          }
        }
      } catch (error) {
        sendEvent({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Verification pipeline failed",
        });
      } finally {
        releaseConcurrencySlot(rateLimitKey);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
