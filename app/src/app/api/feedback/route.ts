import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const feedbackSchema = z.object({
  verification_id: z.string().uuid(),
  claim_id: z.string().uuid().optional(),
  feedback_type: z.enum(["correct", "incorrect", "partially_correct", "report"]),
  comment: z.string().max(1000).optional(),
  suggested_verdict: z.enum(["supported", "contradicted", "unverifiable"]).optional(),
});

/**
 * POST: Submit user feedback on a verification result.
 * Used for reinforcement learning and training data quality improvement.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase.from("verification_feedback").insert({
    verification_id: parsed.data.verification_id,
    claim_id: parsed.data.claim_id || null,
    user_id: user.id,
    feedback_type: parsed.data.feedback_type,
    comment: parsed.data.comment || null,
    suggested_verdict: parsed.data.suggested_verdict || null,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ status: "received" }, { status: 201 });
}
