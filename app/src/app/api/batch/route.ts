import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateApiKey, hasScope, checkApiKeyRateLimit } from "@/lib/security/api-key-auth";
import { sanitizeInput } from "@/lib/security/sanitize";
import { runVerificationPipeline } from "@/lib/verification/pipeline";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { z } from "zod/v4";
import type { AnalysisMode } from "@/types";

export const maxDuration = 60;

const batchSchema = z.object({
  items: z.array(z.object({
    text: z.string().min(50).max(10000),
    language: z.string().optional().default("en"),
    analyses: z.array(z.enum([
      "fact-check", "bias-check", "ai-detection", "plagiarism", "framework-eval", "comprehensive",
    ])).optional().default(["fact-check"]),
  })).min(1).max(50),
  webhook_url: z.string().url().optional(),
});

// POST: Submit a batch verification job
export async function POST(request: NextRequest) {
  // Batch requires API key auth (not session)
  const authHeader = request.headers.get("authorization");
  const apiKeyAuth = await authenticateApiKey(authHeader);

  if (!apiKeyAuth) {
    return NextResponse.json(
      { error: "API key authentication required for batch operations. Use Bearer token." },
      { status: 401 }
    );
  }

  if (!hasScope(apiKeyAuth, "batch")) {
    return NextResponse.json(
      { error: "API key does not have 'batch' scope" },
      { status: 403 }
    );
  }

  const keyRateCheck = checkApiKeyRateLimit(apiKeyAuth.keyId, apiKeyAuth.rateLimitPerMinute);
  if (!keyRateCheck.allowed) {
    const retryAfterSec = Math.ceil(keyRateCheck.retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: retryAfterSec },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Provide items[] with text (50-10000 chars), max 50 items." },
      { status: 400 }
    );
  }

  const supabaseAdmin = await createServiceClient();

  // Check monthly quota BEFORE processing — each batch item counts as 1 verification
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("monthly_verification_count, plan")
    .eq("id", apiKeyAuth.userId)
    .single();

  if (userProfile) {
    const planLimits: Record<string, number> = { free: 10, pro: 500, team: 2000, enterprise: 10000 };
    const limit = planLimits[userProfile.plan] ?? 10;
    const remaining = limit - (userProfile.monthly_verification_count ?? 0);
    if (parsed.data.items.length > remaining) {
      return NextResponse.json(
        { error: `Batch of ${parsed.data.items.length} items exceeds your remaining monthly quota of ${remaining}.` },
        { status: 429 }
      );
    }
  }

  // Create batch job record
  const { data: batchJob, error: jobError } = await supabaseAdmin
    .from("batch_jobs")
    .insert({
      user_id: apiKeyAuth.userId,
      total_items: parsed.data.items.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (jobError || !batchJob) {
    return NextResponse.json({ error: "Failed to create batch job" }, { status: 500 });
  }

  const jobId = batchJob.id;

  // Process synchronously — Vercel terminates after response, so async background won't work
  try {
    await processBatchItems(
      jobId,
      parsed.data.items,
      apiKeyAuth.userId,
      apiKeyAuth.orgId,
      apiKeyAuth.keyId
    );
  } catch {
    await supabaseAdmin
      .from("batch_jobs")
      .update({ status: "failed" })
      .eq("id", jobId);
  }

  // Fetch the final job state
  const { data: finalJob } = await supabaseAdmin
    .from("batch_jobs")
    .select("status, completed_items, failed_items, completed_at")
    .eq("id", jobId)
    .single();

  return NextResponse.json({
    job_id: jobId,
    total_items: parsed.data.items.length,
    completed_items: finalJob?.completed_items ?? 0,
    failed_items: finalJob?.failed_items ?? 0,
    status: finalJob?.status ?? "processing",
    poll_url: `/api/batch?id=${jobId}`,
  }, { status: 200 });
}

// GET: Poll batch job status
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const apiKeyAuth = await authenticateApiKey(authHeader);

  // Also support session auth for polling
  let userId: string | null = null;

  if (apiKeyAuth) {
    userId = apiKeyAuth.userId;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  const supabaseAdmin = await createServiceClient();

  if (!jobId) {
    // List recent batch jobs
    const { data: jobs } = await supabaseAdmin
      .from("batch_jobs")
      .select("id, status, total_items, completed_items, failed_items, created_at, completed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ jobs: jobs || [] });
  }

  const { data: job, error } = await supabaseAdmin
    .from("batch_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Batch job not found" }, { status: 404 });
  }

  // If completed, include results summary
  let results: unknown[] = [];
  if (job.status === "completed" || job.status === "partial") {
    const { data: verifications } = await supabaseAdmin
      .from("verifications")
      .select("id, trust_score, total_claims, supported_count, contradicted_count, unverifiable_count, processing_time_ms, created_at")
      .eq("user_id", userId)
      .gte("created_at", job.created_at)
      .lte("created_at", job.completed_at || new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(job.total_items);

    results = verifications || [];
  }

  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      total_items: job.total_items,
      completed_items: job.completed_items,
      failed_items: job.failed_items,
      created_at: job.created_at,
      completed_at: job.completed_at,
    },
    results,
  });
}

// Background processing function
async function processBatchItems(
  jobId: string,
  items: Array<{ text: string; language: string; analyses: string[] }>,
  userId: string,
  orgId: string | null,
  apiKeyId: string
): Promise<void> {
  const supabaseAdmin = await createServiceClient();
  let completedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    try {
      let sanitizedText: string;
      try {
        sanitizedText = sanitizeInput(item.text);
      } catch {
        failedCount++;
        continue;
      }

      // Run verification pipeline
      interface BatchEventResult {
        verification?: Record<string, unknown>;
        claims?: Array<Record<string, unknown>>;
      }
      let lastEvent: BatchEventResult | null = null;
      for await (const event of runVerificationPipeline(sanitizedText, item.language, item.analyses as AnalysisMode[])) {
        if (event.type === "completed") {
          lastEvent = event as unknown as BatchEventResult;
        }
      }

      if (lastEvent?.verification) {
        // Save to database
        const { data: saved } = await supabaseAdmin
          .from("verifications")
          .insert({
            user_id: userId,
            org_id: orgId,
            api_key_id: apiKeyId,
            input_text: sanitizedText,
            language: lastEvent.verification.language,
            total_claims: lastEvent.verification.total_claims,
            supported_count: lastEvent.verification.supported_count,
            unverifiable_count: lastEvent.verification.unverifiable_count,
            contradicted_count: lastEvent.verification.contradicted_count,
            trust_score: lastEvent.verification.trust_score,
            status: "completed",
            processing_time_ms: lastEvent.verification.processing_time_ms,
          })
          .select("id")
          .single();

        if (saved && lastEvent.claims && lastEvent.claims.length > 0) {
          const claimsToInsert = lastEvent.claims.map((c: Record<string, unknown>) => ({
            verification_id: saved.id,
            claim_text: c.claim_text,
            original_sentence: c.original_sentence,
            verdict: c.verdict,
            confidence: c.confidence,
            reasoning: c.reasoning,
            sources: c.sources,
            position_start: c.position_start,
            position_end: c.position_end,
          }));
          await supabaseAdmin.from("claims").insert(claimsToInsert);
        }

        completedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }

    // Update progress
    await supabaseAdmin
      .from("batch_jobs")
      .update({
        completed_items: completedCount,
        failed_items: failedCount,
      })
      .eq("id", jobId);
  }

  // Mark job as done
  const finalStatus = failedCount === items.length ? "failed" : failedCount > 0 ? "partial" : "completed";
  await supabaseAdmin
    .from("batch_jobs")
    .update({
      status: finalStatus,
      completed_items: completedCount,
      failed_items: failedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  // Dispatch webhook for batch completion
  if (orgId) {
    await dispatchWebhook(orgId, "batch.completed", {
      job_id: jobId,
      total_items: items.length,
      completed_items: completedCount,
      failed_items: failedCount,
      status: finalStatus,
    }).catch(() => { /* fire-and-forget */ });
  }
}
