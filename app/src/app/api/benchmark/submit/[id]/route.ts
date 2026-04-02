import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { gradeSubmission } from "@/lib/benchmark/grading";
import { z } from "zod/v4";
import type { BenchmarkExamQuestion } from "@/types";

const submitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

// POST: Submit answers for a specific submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
    return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabaseAdmin = await createServiceClient();

  // Verify agent
  const { data: agent } = await supabaseAdmin
    .from("benchmark_agents")
    .select("id")
    .eq("api_token", token)
    .eq("is_active", true)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Invalid API token" }, { status: 403 });
  }

  // Get submission
  const { data: submission } = await supabaseAdmin
    .from("benchmark_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("agent_id", agent.id)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.status !== "started") {
    return NextResponse.json(
      { error: `Submission already ${submission.status}` },
      { status: 409 }
    );
  }

  // Check time limit
  const startedAt = new Date(submission.started_at);
  const { data: exam } = await supabaseAdmin
    .from("benchmark_exams")
    .select("*")
    .eq("id", submission.exam_id)
    .single();

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const timeLimitMs = exam.time_limit_minutes * 60 * 1000;
  if (Date.now() - startedAt.getTime() > timeLimitMs) {
    await supabaseAdmin
      .from("benchmark_submissions")
      .update({ status: "timed_out" })
      .eq("id", submissionId);

    return NextResponse.json(
      { error: "Time limit exceeded. Submission marked as timed out." },
      { status: 410 }
    );
  }

  // Parse answers
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Provide 'answers' as a map of question IDs to answer strings." },
      { status: 400 }
    );
  }

  const { answers } = parsed.data;

  // Grade the submission
  const questions = exam.questions as BenchmarkExamQuestion[];
  const grading = await gradeSubmission(questions, answers);

  const now = new Date().toISOString();

  // Update submission
  await supabaseAdmin
    .from("benchmark_submissions")
    .update({
      status: "completed",
      answers,
      score: grading.score,
      max_score: grading.maxScore,
      percentage: grading.percentage,
      passed: grading.passed,
      details: { results: grading.results },
      submitted_at: now,
      graded_at: now,
    })
    .eq("id", submissionId);

  // Update agent stats
  const { data: allSubmissions } = await supabaseAdmin
    .from("benchmark_submissions")
    .select("percentage")
    .eq("agent_id", agent.id)
    .eq("status", "completed")
    .not("percentage", "is", null);

  const scores = (allSubmissions || []).map((s) => Number(s.percentage));
  // Include current submission score
  scores.push(grading.percentage);
  const bestScore = Math.max(...scores);
  const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

  await supabaseAdmin
    .from("benchmark_agents")
    .update({
      total_submissions: scores.length,
      best_score: bestScore,
      avg_score: avgScore,
      last_submission_at: now,
    })
    .eq("id", agent.id);

  return NextResponse.json({
    submissionId,
    status: "completed",
    score: grading.score,
    maxScore: grading.maxScore,
    percentage: grading.percentage,
    passed: grading.passed,
    startedAt: submission.started_at,
    submittedAt: now,
  });
}

// GET: Check submission result (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
    return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
  }

  const supabaseAdmin = await createServiceClient();
  const { data: submission } = await supabaseAdmin
    .from("benchmark_submissions")
    .select("id, agent_id, exam_id, status, score, max_score, percentage, passed, started_at, submitted_at")
    .eq("id", submissionId)
    .eq("status", "completed")
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  return NextResponse.json(submission);
}
