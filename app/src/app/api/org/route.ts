import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  plan: z.enum(["team", "enterprise"]).optional().default("team"),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// GET: Get the user's organization
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
    return NextResponse.json({ org: null });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  if (!org) {
    return NextResponse.json({ org: null });
  }

  // Get member count
  const { count } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org.id);

  // Get current user's role
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    org: { ...org, member_count: count || 0 },
    role: membership?.role || null,
  });
}

// POST: Create a new organization
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Check user is not already in an org
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, plan")
    .eq("id", user.id)
    .single();

  if (profile?.org_id) {
    return NextResponse.json(
      { error: "You are already a member of an organization. Leave your current organization first." },
      { status: 400 }
    );
  }

  // Must be on team or enterprise plan
  if (!profile || !["team", "enterprise"].includes(profile.plan)) {
    return NextResponse.json(
      { error: "Organization creation requires a Team or Enterprise plan." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Provide name and slug." }, { status: 400 });
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.slug)
    .single();

  if (existing) {
    return NextResponse.json({ error: "This slug is already taken. Choose a different one." }, { status: 409 });
  }

  // Create org + add creator as owner — use service client for cross-table ops
  const maxSeats = parsed.data.plan === "enterprise" ? 100 : 25;
  const supabaseAdmin = await createServiceClient();

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      plan: parsed.data.plan,
      max_seats: maxSeats,
    })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }

  // Add creator as owner
  await supabaseAdmin.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
  });

  // Update profile with org_id
  await supabaseAdmin
    .from("profiles")
    .update({ org_id: org.id })
    .eq("id", user.id);

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "org_created",
    entity_type: "organization",
    entity_id: org.id,
    metadata: { name: org.name, slug: org.slug, plan: org.plan },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ org }, { status: 201 });
}

// PATCH: Update organization settings
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

  // Check role: only owner/admin can update
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Only owners and admins can update organization settings" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.logo_url !== undefined) updates.logo_url = parsed.data.logo_url;
  if (parsed.data.settings !== undefined) updates.settings = parsed.data.settings;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", profile.org_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }

  return NextResponse.json({ org });
}
