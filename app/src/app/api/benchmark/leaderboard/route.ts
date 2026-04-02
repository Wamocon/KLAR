import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET: Public leaderboard
export async function GET(request: NextRequest) {
  const supabaseAdmin = await createServiceClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
  const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);

  const { data: agents, error } = await supabaseAdmin
    .from("benchmark_agents")
    .select("id, name, model, agent_type, total_submissions, best_score, avg_score, registered_at, last_submission_at")
    .eq("is_active", true)
    .gt("total_submissions", 0)
    .order("best_score", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }

  const leaderboard = (agents || []).map((agent, index) => ({
    rank: offset + index + 1,
    agentId: agent.id,
    agentName: agent.name,
    model: agent.model,
    agentType: agent.agent_type,
    bestScore: agent.best_score,
    avgScore: agent.avg_score,
    totalSubmissions: agent.total_submissions,
    lastSubmissionAt: agent.last_submission_at,
  }));

  // Get total count
  const { count } = await supabaseAdmin
    .from("benchmark_agents")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .gt("total_submissions", 0);

  return NextResponse.json({
    leaderboard,
    total: count || 0,
    limit,
    offset,
  });
}
