import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { authenticateApiKey, hasScope } from "@/lib/security/api-key-auth";
import { z } from "zod/v4";
import type { ComplianceReportType } from "@/types";

const generateReportSchema = z.object({
  report_type: z.enum(["ai_act_transparency", "ai_act_risk_assessment", "monthly_summary", "audit_export"]),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  title: z.string().min(1).max(200).optional(),
});

// Auth helper: resolve user from session or API key
async function resolveAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer klar_")) {
    const apiKeyAuth = await authenticateApiKey(authHeader);
    if (apiKeyAuth && hasScope(apiKeyAuth, "compliance")) {
      return { userId: apiKeyAuth.userId, orgId: apiKeyAuth.orgId, via: "api_key" as const };
    }
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  return { userId: user.id, orgId: profile?.org_id || null, via: "session" as const };
}

// GET: List compliance reports or get a specific one
export async function GET(request: NextRequest) {
  const auth = await resolveAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("id");
  const supabaseAdmin = await createServiceClient();

  if (reportId) {
    const { data: report, error } = await supabaseAdmin
      .from("compliance_reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", auth.userId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  }

  // List reports
  const query = supabaseAdmin
    .from("compliance_reports")
    .select("id, report_type, title, period_start, period_end, generated_at")
    .eq("user_id", auth.userId)
    .order("generated_at", { ascending: false })
    .limit(50);

  if (auth.orgId) {
    query.eq("org_id", auth.orgId);
  }

  const { data: reports } = await query;
  return NextResponse.json({ reports: reports || [] });
}

// POST: Generate a new compliance report
export async function POST(request: NextRequest) {
  const auth = await resolveAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = generateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input. Provide report_type, period_start, period_end." }, { status: 400 });
  }

  const periodStart = new Date(parsed.data.period_start);
  const periodEnd = new Date(parsed.data.period_end);

  if (periodEnd <= periodStart) {
    return NextResponse.json({ error: "period_end must be after period_start" }, { status: 400 });
  }

  if (periodEnd > new Date()) {
    return NextResponse.json({ error: "period_end cannot be in the future" }, { status: 400 });
  }

  // Generate report data based on type
  const reportData = await generateReportData(
    parsed.data.report_type as ComplianceReportType,
    auth.userId,
    auth.orgId,
    periodStart.toISOString(),
    periodEnd.toISOString()
  );

  const title = parsed.data.title || formatDefaultTitle(parsed.data.report_type, periodStart, periodEnd);
  const supabaseAdmin = await createServiceClient();

  const { data: report, error } = await supabaseAdmin
    .from("compliance_reports")
    .insert({
      org_id: auth.orgId,
      user_id: auth.userId,
      report_type: parsed.data.report_type,
      title,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      data: reportData,
    })
    .select()
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from("audit_log").insert({
    user_id: auth.userId,
    action: "compliance_report_generated",
    entity_type: "compliance_report",
    entity_id: report.id,
    metadata: { report_type: parsed.data.report_type, period: `${parsed.data.period_start} to ${parsed.data.period_end}` },
    ip_address: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ report }, { status: 201 });
}

function formatDefaultTitle(type: string, start: Date, end: Date): string {
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];
  const labels: Record<string, string> = {
    ai_act_transparency: "EU AI Act Transparency Report",
    ai_act_risk_assessment: "EU AI Act Risk Assessment",
    monthly_summary: "Monthly Verification Summary",
    audit_export: "Audit Trail Export",
  };
  return `${labels[type] || type} — ${startStr} to ${endStr}`;
}

async function generateReportData(
  type: ComplianceReportType,
  userId: string,
  orgId: string | null,
  periodStart: string,
  periodEnd: string
): Promise<Record<string, unknown>> {
  // Get verifications in period
  const supabaseAdmin = await createServiceClient();
  const query = supabaseAdmin
    .from("verifications")
    .select("id, trust_score, total_claims, supported_count, contradicted_count, unverifiable_count, processing_time_ms, language, status, created_at")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd)
    .eq("status", "completed");

  if (orgId) {
    query.eq("org_id", orgId);
  } else {
    query.eq("user_id", userId);
  }

  const { data: verifications } = await query;
  const items = verifications || [];

  // Aggregate statistics
  const totalVerifications = items.length;
  const avgTrustScore = totalVerifications > 0
    ? items.reduce((sum, v) => sum + v.trust_score, 0) / totalVerifications
    : 0;
  const totalClaims = items.reduce((sum, v) => sum + v.total_claims, 0);
  const totalSupported = items.reduce((sum, v) => sum + v.supported_count, 0);
  const totalContradicted = items.reduce((sum, v) => sum + v.contradicted_count, 0);
  const totalUnverifiable = items.reduce((sum, v) => sum + v.unverifiable_count, 0);
  const avgProcessingTime = totalVerifications > 0
    ? items.reduce((sum, v) => sum + v.processing_time_ms, 0) / totalVerifications
    : 0;
  const languageBreakdown: Record<string, number> = {};
  items.forEach((v) => {
    languageBreakdown[v.language] = (languageBreakdown[v.language] || 0) + 1;
  });

  const trustDistribution = {
    high: items.filter((v) => v.trust_score >= 0.8).length,
    medium: items.filter((v) => v.trust_score >= 0.5 && v.trust_score < 0.8).length,
    low: items.filter((v) => v.trust_score < 0.5).length,
  };

  const base = {
    period: { start: periodStart, end: periodEnd },
    generated_at: new Date().toISOString(),
    summary: {
      total_verifications: totalVerifications,
      average_trust_score: Math.round(avgTrustScore * 100) / 100,
      total_claims: totalClaims,
      claims_supported: totalSupported,
      claims_contradicted: totalContradicted,
      claims_unverifiable: totalUnverifiable,
      average_processing_time_ms: Math.round(avgProcessingTime),
      language_breakdown: languageBreakdown,
      trust_distribution: trustDistribution,
    },
  };

  if (type === "ai_act_transparency") {
    return {
      ...base,
      eu_ai_act: {
        article: "Article 52 — Transparency obligations",
        compliance_status: "documented",
        ai_system_description: "KLAR uses Google Gemini 2.5 Flash for natural language claim extraction and verification against web sources, Wikipedia, and credibility-scored databases.",
        risk_category: "limited",
        human_oversight: "All AI outputs include confidence scores. Users can submit human reviews overriding AI verdicts.",
        data_governance: {
          input_data: "User-provided text, URLs, or uploaded documents. No personal data is used for model training.",
          output_data: "Structured verification results with claim-level verdicts, sources, and trust scores.",
          retention_policy: "User data is retained until account deletion (GDPR Art. 17 compliant).",
          data_residency: "Supabase Frankfurt (eu-central-1). All data stored within EU jurisdiction.",
        },
        accuracy_metrics: {
          average_trust_score: base.summary.average_trust_score,
          claim_verification_rate: totalClaims > 0
            ? Math.round(((totalSupported + totalContradicted) / totalClaims) * 100) / 100
            : 0,
          source_coverage: totalClaims > 0
            ? Math.round((totalSupported / totalClaims) * 100) / 100
            : 0,
        },
      },
    };
  }

  if (type === "ai_act_risk_assessment") {
    return {
      ...base,
      risk_assessment: {
        system_name: "KLAR Verification Engine",
        risk_level: "limited",
        rationale: "Content verification is classified as limited-risk under EU AI Act. The system does not make autonomous decisions affecting individuals' rights or access to essential services.",
        mitigations: [
          "Transparent confidence scoring for every claim",
          "Source attribution with credibility scores",
          "Human review override mechanism",
          "Adversarial input detection and blocking",
          "GDPR-compliant data handling with user deletion rights",
        ],
        monitoring: {
          low_trust_rate: trustDistribution.low / Math.max(totalVerifications, 1),
          contradicted_rate: totalClaims > 0 ? totalContradicted / totalClaims : 0,
          average_confidence: base.summary.average_trust_score,
        },
      },
    };
  }

  if (type === "audit_export") {
    // Include detailed audit trail
    const auditQuery = supabaseAdmin
      .from("audit_log")
      .select("id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at")
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (orgId) {
      // Get all org member IDs for filtering
      const { data: members } = await supabaseAdmin
        .from("org_members")
        .select("user_id")
        .eq("org_id", orgId);

      const memberIds = (members || []).map((m) => m.user_id);
      if (memberIds.length > 0) {
        auditQuery.in("user_id", memberIds);
      }
    } else {
      auditQuery.eq("user_id", userId);
    }

    const { data: auditEntries } = await auditQuery;

    return {
      ...base,
      audit_trail: {
        total_entries: (auditEntries || []).length,
        entries: (auditEntries || []).map((e) => ({
          timestamp: e.created_at,
          action: e.action,
          entity_type: e.entity_type,
          entity_id: e.entity_id,
          metadata: e.metadata,
          ip_address: e.ip_address,
        })),
      },
    };
  }

  // monthly_summary
  return base;
}
