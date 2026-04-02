import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createWebhookSchema = z.object({
  url: z.url(),
  events: z.array(z.enum([
    "verification.completed",
    "batch.completed",
    "member.joined",
    "member.removed",
    "report.generated",
  ])).min(1),
});

// GET: List org webhooks
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
    return NextResponse.json({ error: "Organization membership required" }, { status: 403 });
  }

  // Check admin/owner role
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, events, is_active, failure_count, last_triggered_at, created_at")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: webhooks || [] });
}

// POST: Create a webhook
export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Organization membership required" }, { status: 403 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid HTTPS url and at least one event" }, { status: 400 });
  }

  // HTTPS-only enforcement
  if (!parsed.data.url.startsWith("https://")) {
    return NextResponse.json({ error: "Webhook URL must use HTTPS" }, { status: 400 });
  }

  // Max 10 webhooks per org
  const { count } = await supabase
    .from("webhooks")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id);

  if ((count || 0) >= 10) {
    return NextResponse.json(
      { error: "Maximum of 10 webhooks per organization" },
      { status: 400 }
    );
  }

  // Generate signing secret
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const { data: webhook, error } = await supabase
    .from("webhooks")
    .insert({
      org_id: profile.org_id,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
    })
    .select("id, url, events, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }

  // Audit
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "webhook_created",
    entity_type: "webhook",
    entity_id: webhook.id,
    metadata: { url: parsed.data.url, events: parsed.data.events },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({
    webhook,
    signing_secret: secret,
    warning: "Store this signing secret securely. It will not be shown again.",
  }, { status: 201 });
}

// DELETE: Remove a webhook
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
    return NextResponse.json({ error: "Organization membership required" }, { status: 403 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", profile.org_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("id");

  if (!webhookId) {
    return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("org_id", profile.org_id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
