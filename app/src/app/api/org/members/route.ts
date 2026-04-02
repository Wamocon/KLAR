import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const patchSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

const deleteSchema = z.object({
  user_id: z.string().uuid(),
});

// GET: List organization members
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  // Get members with profile info (use service client to join across tables)
  const supabaseAdmin = await createServiceClient();
  const { data: members, error } = await supabaseAdmin
    .from("org_members")
    .select("id, user_id, role, joined_at")
    .eq("org_id", profile.org_id)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  // Enrich with email + name from profiles
  const memberIds = (members || []).map((m) => m.user_id);
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", memberIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const enriched = (members || []).map((m) => ({
    ...m,
    email: profileMap.get(m.user_id)?.email ?? null,
    full_name: profileMap.get(m.user_id)?.full_name ?? null,
    avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
  }));

  return NextResponse.json({ members: enriched });
}

// PATCH: Update a member's role
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  // Only owners can change roles
  const { data: callerMembership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", user.id)
    .single();

  if (!callerMembership || callerMembership.role !== "owner") {
    return NextResponse.json({ error: "Only the organization owner can change member roles" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide user_id (UUID) and role (admin or member)" }, { status: 400 });
  }

  const { user_id: targetUserId, role: newRole } = parsed.data;

  // Cannot change your own role
  if (targetUserId === user.id) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }

  const supabaseAdmin = await createServiceClient();
  const { error } = await supabaseAdmin
    .from("org_members")
    .update({ role: newRole })
    .eq("org_id", profile.org_id)
    .eq("user_id", targetUserId);

  if (error) {
    return NextResponse.json({ error: "Failed to update member role" }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "org_member_role_changed",
    entity_type: "org_member",
    entity_id: targetUserId,
    metadata: { new_role: newRole },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ success: true });
}

// DELETE: Remove a member from the organization
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const rawUserId = searchParams.get("user_id");

  const parsed = deleteSchema.safeParse({ user_id: rawUserId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid user_id (UUID) parameter required" }, { status: 400 });
  }
  const targetUserId = parsed.data.user_id;

  // Self-removal: any member can leave
  if (targetUserId === user.id) {
    // Check if user is owner — owners can't leave without transferring ownership
    const { data: myMembership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", profile.org_id)
      .eq("user_id", user.id)
      .single();

    if (myMembership?.role === "owner") {
      return NextResponse.json(
        { error: "Owners cannot leave. Transfer ownership first or delete the organization." },
        { status: 400 }
      );
    }
  } else {
    // Removing another member: must be owner or admin
    const { data: callerMembership } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", profile.org_id)
      .eq("user_id", user.id)
      .single();

    if (!callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    // Admins cannot remove other admins or owners
    const supabaseAdmin = await createServiceClient();
    const { data: targetMembership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", profile.org_id)
      .eq("user_id", targetUserId)
      .single();

    if (targetMembership?.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the organization owner" }, { status: 403 });
    }

    if (callerMembership.role === "admin" && targetMembership?.role === "admin") {
      return NextResponse.json({ error: "Admins cannot remove other admins" }, { status: 403 });
    }
  }

  // Remove member
  const adminClient = await createServiceClient();
  await adminClient
    .from("org_members")
    .delete()
    .eq("org_id", profile.org_id)
    .eq("user_id", targetUserId);

  // Clear org_id on their profile
  await adminClient
    .from("profiles")
    .update({ org_id: null })
    .eq("id", targetUserId);

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: targetUserId === user.id ? "org_member_left" : "org_member_removed",
    entity_type: "org_member",
    entity_id: targetUserId,
    metadata: {},
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ success: true });
}
