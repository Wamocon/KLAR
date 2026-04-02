import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { BenchmarkExamQuestion } from "@/types";

function authenticateAgent(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// POST: Start a new exam submission
export async function POST(request: NextRequest) {
  const token = authenticateAgent(request);
  if (!token) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const supabaseAdmin = await createServiceClient();

  // Find the agent by token
  const { data: agent } = await supabaseAdmin
    .from("benchmark_agents")
    .select("id")
    .eq("api_token", token)
    .eq("is_active", true)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Invalid API token" }, { status: 403 });
  }

  // Get the active exam
  const { data: exam } = await supabaseAdmin
    .from("benchmark_exams")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!exam) {
    return NextResponse.json({ error: "No active exam available" }, { status: 404 });
  }

  // Check submission count for this agent + exam
  const { count } = await supabaseAdmin
    .from("benchmark_submissions")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agent.id)
    .eq("exam_id", exam.id);

  if ((count ?? 0) >= exam.max_submissions) {
    return NextResponse.json(
      { error: `Maximum ${exam.max_submissions} submissions reached for this exam.` },
      { status: 412 }
    );
  }

  // Create submission
  const { data: submission, error } = await supabaseAdmin
    .from("benchmark_submissions")
    .insert({
      agent_id: agent.id,
      exam_id: exam.id,
      status: "started",
    })
    .select("id, status, started_at")
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Failed to start exam" }, { status: 500 });
  }

  // Return questions without answers
  const questions = (exam.questions as BenchmarkExamQuestion[]).map((q) => ({
    id: q.id,
    text: q.text,
  }));

  return NextResponse.json({
    submissionId: submission.id,
    status: "started",
    startedAt: submission.started_at,
    timeLimitMinutes: exam.time_limit_minutes,
    questions,
  });
}

// GET: List exams or check submission status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get("submission");
  const supabaseAdmin = await createServiceClient();

  if (submissionId) {
    // Check specific submission
    const token = authenticateAgent(request);
    if (!token) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const { data: agent } = await supabaseAdmin
      .from("benchmark_agents")
      .select("id")
      .eq("api_token", token)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Invalid API token" }, { status: 403 });
    }

    const { data: submission } = await supabaseAdmin
      .from("benchmark_submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("agent_id", agent.id)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json(submission);
  }

  // List active exams (public)
  const { data: exams } = await supabaseAdmin
    .from("benchmark_exams")
    .select("id, title, description, version, category, total_questions, time_limit_minutes, max_submissions, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ exams: exams || [] });
}
