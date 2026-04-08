import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { redisHealthCheck, isRedisAvailable } from "@/lib/security/redis-rate-limiter";

/**
 * GET /api/health — System health check
 *
 * Returns connectivity status for all external services.
 * Used by uptime monitors, CI/CD, and the dashboard.
 */
export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: "ok" | "error" | "skipped"; latency?: number; detail?: string }> = {};

  // 1. Supabase
  try {
    const t0 = Date.now();
    const supabase = await createServiceClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    checks.supabase = error
      ? { status: "error", latency: Date.now() - t0, detail: error.message }
      : { status: "ok", latency: Date.now() - t0 };
  } catch (err) {
    checks.supabase = { status: "error", detail: String(err) };
  }

  // 2. Redis (optional)
  if (isRedisAvailable()) {
    try {
      const t0 = Date.now();
      const ok = await redisHealthCheck();
      checks.redis = ok
        ? { status: "ok", latency: Date.now() - t0 }
        : { status: "error", latency: Date.now() - t0, detail: "PING failed" };
    } catch (err) {
      checks.redis = { status: "error", detail: String(err) };
    }
  } else {
    checks.redis = { status: "skipped", detail: "UPSTASH_REDIS_REST_URL not configured" };
  }

  // 3. Gemini API key presence
  checks.gemini = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ? { status: "ok" }
    : { status: "error", detail: "GOOGLE_GENERATIVE_AI_API_KEY not set" };

  // 4. Serper API key presence
  checks.serper = process.env.SERPER_API_KEY
    ? { status: "ok" }
    : { status: "skipped", detail: "SERPER_API_KEY not set (using grounded search only)" };

  const allOk = Object.values(checks).every(c => c.status !== "error");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : undefined,
      latency: Date.now() - start,
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
