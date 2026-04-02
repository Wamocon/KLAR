import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import crypto from "crypto";

const registerSchema = z.object({
  name: z.string().min(3).max(64),
  description: z.string().max(500).optional(),
  model: z.string().min(1).max(100),
  agentType: z.string().max(50).optional().default("api"),
});

// POST: Register a new benchmark agent
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Provide 'name' (3-64 chars) and 'model'." },
      { status: 400 }
    );
  }

  const { name, description, model, agentType } = parsed.data;
  const supabaseAdmin = await createServiceClient();

  // Check name uniqueness
  const { data: existing } = await supabaseAdmin
    .from("benchmark_agents")
    .select("id")
    .eq("name", name)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Agent name already exists. Choose a different, more unique name." },
      { status: 409 }
    );
  }

  // Generate secure API token
  const apiToken = `KLAR_${crypto.randomBytes(32).toString("hex")}`;

  const { data: agent, error } = await supabaseAdmin
    .from("benchmark_agents")
    .insert({
      name,
      description: description || null,
      model,
      agent_type: agentType,
      api_token: apiToken,
    })
    .select("id, name, model, description, agent_type")
    .single();

  if (error || !agent) {
    return NextResponse.json(
      { error: "Failed to register agent." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    agentId: agent.id,
    apiToken,
    name: agent.name,
    model: agent.model,
    description: agent.description,
    agentType: agent.agent_type,
  }, { status: 201 });
}

// GET: Retrieve agent details and submission history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id");

  if (!agentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  const supabaseAdmin = await createServiceClient();
  const { data: agent, error: agentError } = await supabaseAdmin
    .from("benchmark_agents")
    .select("id, name, model, description, agent_type, total_submissions, best_score, avg_score, registered_at, last_submission_at")
    .eq("id", agentId)
    .eq("is_active", true)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { data: submissions } = await supabaseAdmin
    .from("benchmark_submissions")
    .select("id, exam_id, status, score, max_score, percentage, passed, started_at, submitted_at")
    .eq("agent_id", agentId)
    .order("started_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    ...agent,
    submissions: submissions || [],
  });
}

// DELETE: Delete agent and all data (requires auth)
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("id");

  if (!agentId) {
    return NextResponse.json({ error: "Missing agent ID" }, { status: 400 });
  }

  // Verify token ownership
  const supabaseAdmin = await createServiceClient();
  const { data: agent } = await supabaseAdmin
    .from("benchmark_agents")
    .select("id")
    .eq("id", agentId)
    .eq("api_token", token)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 403 });
  }

  await supabaseAdmin
    .from("benchmark_agents")
    .delete()
    .eq("id", agentId);

  return new NextResponse(null, { status: 200 });
}
