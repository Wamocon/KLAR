import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runVerificationPipeline } from "@/lib/verification/pipeline";
import { sanitizeInput } from "@/lib/security/sanitize";
import { z } from "zod/v4";

export const maxDuration = 60;

const batchSchema = z.object({
  items: z.array(
    z.object({
      text: z.string().min(50).max(50000),
      language: z.string().optional().default("en"),
    })
  ).min(1).max(20),
});

// POST: Submit a batch verification job
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Batch requires authentication
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required for batch verifications." },
      { status: 401 }
    );
  }

  // Check plan — batch only for pro+ users
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, monthly_verification_count, monthly_reset_at")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return NextResponse.json(
      { error: "Batch verification requires a Pro or higher plan." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Provide 'items' array (1-20 items, each with 'text' 50-10000 chars)." },
      { status: 400 }
    );
  }

  const { items } = parsed.data;

  // Create batch job
  const supabaseAdmin = await createServiceClient();
  const { data: job, error: jobError } = await supabaseAdmin
    .from("batch_jobs")
    .insert({
      user_id: user.id,
      status: "processing",
      total_items: items.length,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create batch job" }, { status: 500 });
  }

  // Process items (run sequentially to avoid overloading AI)
  const results: Array<{
    index: number;
    text: string;
    trust_score: number | null;
    total_claims: number;
    supported: number;
    contradicted: number;
    unverifiable: number;
    status: "completed" | "failed";
    error?: string;
  }> = [];

  let completedItems = 0;
  let failedItems = 0;
  let totalScore = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const sanitized = sanitizeInput(item.text);
      let trustScore = 0;
      let totalClaims = 0;
      let supported = 0;
      let contradicted = 0;
      let unverifiable = 0;

      for await (const event of runVerificationPipeline(sanitized, item.language)) {
        if (event.type === "completed") {
          trustScore = event.verification.trust_score;
          totalClaims = event.verification.total_claims;
          supported = event.verification.supported_count;
          contradicted = event.verification.contradicted_count;
          unverifiable = event.verification.unverifiable_count;
        }
      }

      results.push({
        index: i,
        text: item.text.substring(0, 100) + (item.text.length > 100 ? "…" : ""),
        trust_score: trustScore,
        total_claims: totalClaims,
        supported,
        contradicted,
        unverifiable,
        status: "completed",
      });

      totalScore += trustScore;
      completedItems++;
    } catch (error) {
      results.push({
        index: i,
        text: item.text.substring(0, 100) + (item.text.length > 100 ? "…" : ""),
        trust_score: null,
        total_claims: 0,
        supported: 0,
        contradicted: 0,
        unverifiable: 0,
        status: "failed",
        error: error instanceof Error ? error.message : "Verification failed",
      });
      failedItems++;
    }
  }

  const avgTrustScore = completedItems > 0
    ? Math.round((totalScore / completedItems) * 10) / 10
    : null;

  // Update batch job
  await supabaseAdmin
    .from("batch_jobs")
    .update({
      status: "completed",
      completed_items: completedItems,
      failed_items: failedItems,
      avg_trust_score: avgTrustScore,
      results,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  // Update monthly count
  for (let i = 0; i < completedItems; i++) {
    await supabase.rpc("increment_monthly_count", { user_id_input: user.id });
  }

  return NextResponse.json({
    jobId: job.id,
    status: "completed",
    totalItems: items.length,
    completedItems,
    failedItems,
    avgTrustScore,
    results,
  });
}

// GET: Check batch job status
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  if (jobId) {
    // Get specific job
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const { data: job } = await supabase
      .from("batch_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  }

  // List recent jobs
  const { data: jobs } = await supabase
    .from("batch_jobs")
    .select("id, status, total_items, completed_items, failed_items, avg_trust_score, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ jobs: jobs || [] });
}
