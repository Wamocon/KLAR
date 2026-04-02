/**
 * KLAR API Key Authentication
 *
 * Supports Bearer token authentication for programmatic access.
 * API keys are hashed with SHA-256 before storage.
 * The raw key is only shown once at creation time.
 *
 * Key format: klar_<prefix>_<random>  (e.g. klar_a1b2c3d4_...)
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { ApiKeyScope, UserPlan } from "@/types";

export interface ApiKeyAuth {
  keyId: string;
  userId: string;
  orgId: string | null;
  scopes: ApiKeyScope[];
  plan: UserPlan;
  rateLimitPerMinute: number;
}

/**
 * Generate a new API key with prefix for identification.
 * Returns the raw key (only shown once) and the hash for storage.
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const prefix = randomHex(4);
  const secret = randomHex(24);
  const rawKey = `klar_${prefix}_${secret}`;
  const keyHash = hashKey(rawKey);
  return { rawKey, keyHash, keyPrefix: `klar_${prefix}` };
}

/**
 * Hash an API key for secure storage using Web Crypto (SHA-256).
 * Synchronous fallback using Node.js crypto.
 */
function hashKey(key: string): string {
  // Use Node.js crypto (available in Next.js API routes)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(key).digest("hex");
}

function randomHex(bytes: number): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Authenticate a request using a Bearer API key.
 * Returns user/org info + scopes if valid, null if invalid/expired.
 */
export async function authenticateApiKey(
  authHeader: string | null
): Promise<ApiKeyAuth | null> {
  if (!authHeader?.startsWith("Bearer klar_")) return null;

  const rawKey = authHeader.slice(7); // Remove "Bearer "
  const keyHash = hashKey(rawKey);

  const supabaseAdmin = await createServiceClient();
  const { data: keyRecord, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, org_id, scopes, rate_limit_per_minute, expires_at, is_active")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRecord) return null;

  // Check active status
  if (!keyRecord.is_active) return null;

  // Check expiry
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) return null;

  // Resolve user plan
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", keyRecord.user_id)
    .single();

  const plan = (profile?.plan as UserPlan) || "free";

  // Increment usage counter (fire-and-forget)
  supabaseAdmin.rpc("increment_api_key_usage", { key_id_input: keyRecord.id }).then();

  return {
    keyId: keyRecord.id,
    userId: keyRecord.user_id,
    orgId: keyRecord.org_id,
    scopes: keyRecord.scopes as ApiKeyScope[],
    plan,
    rateLimitPerMinute: keyRecord.rate_limit_per_minute,
  };
}

/**
 * Check if an API key has the required scope.
 */
export function hasScope(auth: ApiKeyAuth, scope: ApiKeyScope): boolean {
  return auth.scopes.includes(scope);
}

// ═══════════════════════════════════════════
// API Key Rate Limiting (per-key sliding window)
// ═══════════════════════════════════════════

const apiKeyBurst = new Map<string, number[]>();
let lastApiKeyCleanup = Date.now();

/**
 * Check if an API key request is within its rate limit.
 */
export function checkApiKeyRateLimit(
  keyId: string,
  limitPerMinute: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();

  // Cleanup every 2 minutes
  if (now - lastApiKeyCleanup > 2 * 60 * 1000) {
    const oneMinuteAgo = now - 60 * 1000;
    for (const [k, timestamps] of apiKeyBurst) {
      const filtered = timestamps.filter((t) => t > oneMinuteAgo);
      if (filtered.length === 0) apiKeyBurst.delete(k);
      else apiKeyBurst.set(k, filtered);
    }
    lastApiKeyCleanup = now;
  }

  const timestamps = apiKeyBurst.get(keyId) || [];
  const oneMinuteAgo = now - 60 * 1000;
  const recent = timestamps.filter((t) => t > oneMinuteAgo);

  if (recent.length >= limitPerMinute) {
    const oldest = Math.min(...recent);
    return { allowed: false, retryAfterMs: oldest + 60 * 1000 - now };
  }

  recent.push(now);
  apiKeyBurst.set(keyId, recent);
  return { allowed: true, retryAfterMs: 0 };
}
