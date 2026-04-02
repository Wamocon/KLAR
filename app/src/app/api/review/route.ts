import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const reviewSchema = z.object({
  claim_id: z.string().uuid(),
  new_verdict: z.enum(["supported", "contradicted", "unverifiable"]),
  comment: z.string().max(1000).optional().default(""),
});

// POST: Submit a human review/override for a claim
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Provide claim_id, new_verdict, and optional comment." },
      { status: 400 }
    );
  }

  const { claim_id, new_verdict, comment } = parsed.data;

  // Verify the claim exists and belongs to the user
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select("id, verdict, verification_id")
    .eq("id", claim_id)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  // Verify ownership
  const { data: verification } = await supabase
    .from("verifications")
    .select("user_id")
    .eq("id", claim.verification_id)
    .single();

  if (!verification || verification.user_id !== user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Insert the review
  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .insert({
      claim_id,
      user_id: user.id,
      original_verdict: claim.verdict,
      new_verdict,
      comment,
    })
    .select("id")
    .single();

  if (reviewError) {
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }

  // Log audit entry
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "claim_reviewed",
    entity_type: "review",
    entity_id: review.id,
    metadata: {
      claim_id,
      original_verdict: claim.verdict,
      new_verdict,
    },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ success: true, review_id: review.id });
}
