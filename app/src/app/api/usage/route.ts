import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CONFIGS } from "@/lib/security/rate-limiter";
import type { UserPlan } from "@/types";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const config = PLAN_CONFIGS.guest;
    return NextResponse.json({
      plan: "guest",
      used: 0, // We can't track accurately server-side for anon; client handles this
      limit: config.monthlyLimit,
      remaining: config.monthlyLimit,
      maxChars: config.maxChars,
      maxFileSize: config.maxFileSize,
      allowedModes: config.allowedModes,
      resetAt: null,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("monthly_verification_count, monthly_reset_at, plan")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const plan = (profile.plan as UserPlan) || "free";
  const config = PLAN_CONFIGS[plan];
  const resetAt = new Date(profile.monthly_reset_at);
  const now = new Date();
  const used = now > resetAt ? 0 : profile.monthly_verification_count;
  const remaining = Math.max(0, config.monthlyLimit - used);

  return NextResponse.json({
    plan,
    used,
    limit: config.monthlyLimit,
    remaining,
    maxChars: config.maxChars,
    maxFileSize: config.maxFileSize,
    allowedModes: config.allowedModes,
    resetAt: resetAt.toISOString(),
  });
}
