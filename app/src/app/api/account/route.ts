import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

// DELETE: Delete all user data (GDPR right to erasure)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  // Ordered deletion respecting foreign key constraints (children first, parents last)
  const completedSteps: string[] = [];

  try {
    // 1. Delete reviews (references claims → verifications → user)
    const { error: e1 } = await serviceClient
      .from("reviews")
      .delete()
      .eq("user_id", user.id);
    if (e1) throw new Error(`Step 1 (reviews): ${e1.message}`);
    completedSteps.push("reviews");

    // 2. Get all verification IDs for this user
    const { data: verifications } = await serviceClient
      .from("verifications")
      .select("id")
      .eq("user_id", user.id);

    const verificationIds = verifications?.map((v) => v.id) || [];

    // 3. Delete claims linked to those verifications
    if (verificationIds.length > 0) {
      // 3a. Delete verification_tags first (references verifications)
      await serviceClient
        .from("verification_tags")
        .delete()
        .in("verification_id", verificationIds);

      const { error: e3 } = await serviceClient
        .from("claims")
        .delete()
        .in("verification_id", verificationIds);
      if (e3) throw new Error(`Step 3 (claims): ${e3.message}`);
    }
    completedSteps.push("claims");

    // 4. Delete verifications
    const { error: e4 } = await serviceClient
      .from("verifications")
      .delete()
      .eq("user_id", user.id);
    if (e4) throw new Error(`Step 4 (verifications): ${e4.message}`);
    completedSteps.push("verifications");

    // 5. Delete batch jobs
    const { error: e5a } = await serviceClient
      .from("batch_jobs")
      .delete()
      .eq("user_id", user.id);
    if (e5a) throw new Error(`Step 5a (batch_jobs): ${e5a.message}`);
    completedSteps.push("batch_jobs");

    // 6. Delete API keys
    const { error: e5b } = await serviceClient
      .from("api_keys")
      .delete()
      .eq("user_id", user.id);
    if (e5b) throw new Error(`Step 6 (api_keys): ${e5b.message}`);
    completedSteps.push("api_keys");

    // 7. Delete compliance reports (if user has org)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (profile?.org_id) {
      // Remove org membership
      await serviceClient
        .from("org_members")
        .delete()
        .eq("user_id", user.id);
      completedSteps.push("org_members");

      // Revoke pending invitations sent by this user
      await serviceClient
        .from("org_invitations")
        .delete()
        .eq("invited_by", user.id);
      completedSteps.push("org_invitations");
    }

    // 8. Delete webhooks created by user (via org membership)
    // (Handled by org cleanup above; webhooks are org-scoped)

    // 9. Delete audit log entries
    const { error: e9 } = await serviceClient
      .from("audit_log")
      .delete()
      .eq("user_id", user.id);
    if (e9) throw new Error(`Step 9 (audit_log): ${e9.message}`);
    completedSteps.push("audit_log");

    // 10. Delete profile (must be last before auth deletion)
    const { error: e10 } = await serviceClient
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (e10) throw new Error(`Step 10 (profiles): ${e10.message}`);
    completedSteps.push("profiles");

    // 7. Log the deletion (without user_id since it's being deleted)
    await serviceClient.from("audit_log").insert({
      user_id: null,
      action: "account_deleted",
      entity_type: "user",
      entity_id: user.id,
      metadata: { deleted_at: new Date().toISOString() },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
    });

    // 8. Delete auth user via admin API
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(
      user.id
    );

    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
      return NextResponse.json(
        { error: "Account data deleted, but auth removal failed. Contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "All data has been permanently deleted." });
  } catch (error) {
    console.error("GDPR deletion error:", error, "Completed steps:", completedSteps);
    return NextResponse.json(
      { error: "Data deletion partially failed. Please contact support for assistance." },
      { status: 500 }
    );
  }
}

// GET: Export all user data (GDPR right to data portability)
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: verifications } = await supabase
    .from("verifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const verificationIds = verifications?.map((v) => v.id) || [];

  let claims: unknown[] = [];
  if (verificationIds.length > 0) {
    const { data } = await supabase
      .from("claims")
      .select("*")
      .in("verification_id", verificationIds);
    claims = data || [];
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", user.id);

  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, is_active, created_at, expires_at, last_used_at, usage_count")
    .eq("user_id", user.id);

  const { data: batchJobs } = await supabase
    .from("batch_jobs")
    .select("id, status, total_items, completed_items, failed_items, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile,
    verifications,
    claims,
    reviews,
    api_keys: apiKeys || [],
    batch_jobs: batchJobs || [],
  });
}
