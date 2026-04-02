import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]).optional().default("member"),
});

// GET: List pending invitations for the org
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

  // Only admins/owners can see invitations
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data: invitations } = await supabase
    .from("org_invitations")
    .select("id, email, role, expires_at, accepted_at, created_at")
    .eq("org_id", profile.org_id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return NextResponse.json({ invitations: invitations || [] });
}

// POST: Create invitation OR accept invitation
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

  // Accept invitation flow: { token: "..." }
  if (typeof body === "object" && body !== null && "token" in body) {
    return acceptInvitation(user.id, (body as { token: string }).token, request);
  }

  // Create invitation flow
  return createInvitation(user.id, body, request);
}

async function createInvitation(userId: string, body: unknown, request: NextRequest) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  // Check role: only owner/admin can invite
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", userId)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only owners and admins can send invitations" }, { status: 403 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid email address" }, { status: 400 });
  }

  // Check seat limits
  const { data: org } = await supabase
    .from("organizations")
    .select("max_seats")
    .eq("id", profile.org_id)
    .single();

  const { count: memberCount } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id);

  const { count: pendingCount } = await supabase
    .from("org_invitations")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  const totalSeats = (memberCount || 0) + (pendingCount || 0);
  if (org && totalSeats >= org.max_seats) {
    return NextResponse.json(
      { error: `Seat limit reached (${org.max_seats}). Upgrade your plan or remove members.` },
      { status: 400 }
    );
  }

  // Check for existing membership
  const supabaseAdmin = await createServiceClient();
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, org_id")
    .eq("email", parsed.data.email)
    .single();

  if (existingProfile?.org_id === profile.org_id) {
    return NextResponse.json({ error: "This user is already a member" }, { status: 409 });
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabase
    .from("org_invitations")
    .select("id")
    .eq("org_id", profile.org_id)
    .eq("email", parsed.data.email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (existingInvite) {
    return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 409 });
  }

  // Generate secure token
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { data: invitation, error } = await supabase
    .from("org_invitations")
    .insert({
      org_id: profile.org_id,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invited_by: userId,
      expires_at: expiresAt,
    })
    .select("id, email, role, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "org_invitation_sent",
    entity_type: "org_invitation",
    entity_id: invitation.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  // Note: In production, send email with acceptance link containing the token.
  // For now, return the token directly (the frontend will show it or email it).
  return NextResponse.json({
    invitation,
    accept_token: token,
    note: "Share this token with the invitee. They can accept via POST /api/org/invite with { token }.",
  }, { status: 201 });
}

async function acceptInvitation(userId: string, token: string, request: NextRequest) {
  if (!token || typeof token !== "string" || token.length < 32) {
    return NextResponse.json({ error: "Invalid invitation token" }, { status: 400 });
  }

  const supabaseAdmin = await createServiceClient();
  const { data: invitation, error } = await supabaseAdmin
    .from("org_invitations")
    .select("id, org_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (error || !invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: "This invitation has already been accepted" }, { status: 400 });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
  }

  // Verify email matches
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("email, org_id")
    .eq("id", userId)
    .single();

  if (!userProfile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  if (userProfile.email !== invitation.email) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address" },
      { status: 403 }
    );
  }

  if (userProfile.org_id) {
    return NextResponse.json(
      { error: "You are already a member of an organization. Leave your current organization first." },
      { status: 400 }
    );
  }

  // Accept: add member, update profile, mark invitation accepted
  await supabaseAdmin.from("org_members").insert({
    org_id: invitation.org_id,
    user_id: userId,
    role: invitation.role,
    invited_by: null, // resolved from invitation
  });

  await supabaseAdmin
    .from("profiles")
    .update({ org_id: invitation.org_id })
    .eq("id", userId);

  await supabaseAdmin
    .from("org_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  // Audit log
  await supabaseAdmin.from("audit_log").insert({
    user_id: userId,
    action: "org_invitation_accepted",
    entity_type: "org_invitation",
    entity_id: invitation.id,
    metadata: { org_id: invitation.org_id, role: invitation.role },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ success: true, org_id: invitation.org_id, role: invitation.role });
}

// DELETE: Revoke a pending invitation
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
  const invitationId = searchParams.get("id");

  if (!invitationId) {
    return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
  }

  // Only owner/admin can revoke
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await supabase
    .from("org_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("org_id", profile.org_id);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
