import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/security/api-key-auth";
import { z } from "zod/v4";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(["verify", "export", "batch", "compliance"])).min(1),
  rate_limit_per_minute: z.number().int().min(1).max(100).optional().default(10),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

// GET: List user's API keys (secrets are never returned)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, rate_limit_per_minute, total_requests, last_used_at, expires_at, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }

  return NextResponse.json({ keys: keys || [] });
}

// POST: Create a new API key
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Check plan: only pro+ can create API keys
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, org_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["pro", "team", "enterprise"].includes(profile.plan)) {
    return NextResponse.json(
      { error: "API keys require a Pro plan or higher. Upgrade your plan to access the API." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Provide name and scopes." }, { status: 400 });
  }

  // Limit: max 10 active keys per user
  const { count } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if ((count || 0) >= 10) {
    return NextResponse.json(
      { error: "Maximum of 10 active API keys per account. Revoke unused keys first." },
      { status: 400 }
    );
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();
  const expiresAt = parsed.data.expires_in_days
    ? new Date(Date.now() + parsed.data.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: newKey, error: insertError } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      org_id: profile.org_id || null,
      name: parsed.data.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: parsed.data.scopes,
      rate_limit_per_minute: parsed.data.rate_limit_per_minute,
      expires_at: expiresAt,
    })
    .select("id, name, key_prefix, scopes, rate_limit_per_minute, expires_at, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  // Log audit entry
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "api_key_created",
    entity_type: "api_key",
    entity_id: newKey.id,
    metadata: { name: parsed.data.name, scopes: parsed.data.scopes },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  // Return the raw key ONCE — it's never stored or returned again
  return NextResponse.json({
    key: newKey,
    raw_key: rawKey,
    warning: "Store this key securely. It will not be shown again.",
  }, { status: 201 });
}

// DELETE: Revoke an API key
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");

  if (!keyId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keyId)) {
    return NextResponse.json({ error: "Invalid key ID" }, { status: 400 });
  }

  // Soft-delete: deactivate rather than remove (audit trail)
  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "api_key_revoked",
    entity_type: "api_key",
    entity_id: keyId,
    metadata: {},
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ success: true });
}
