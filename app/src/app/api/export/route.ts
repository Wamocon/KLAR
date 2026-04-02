import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Generate PDF-ready HTML of a verification report
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid verification ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: verification } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();

  if (!verification) {
    return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  }

  // Access control
  if (verification.user_id && (!user || user.id !== verification.user_id)) {
    if (!verification.is_public) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("verification_id", id)
    .order("position_start", { ascending: true });

  const claimsList = claims || [];

  const verdictColor = (v: string) =>
    v === "supported" ? "#10b981" : v === "contradicted" ? "#ef4444" : "#f59e0b";

  const verdictLabel = (v: string) =>
    v === "supported" ? "Supported" : v === "contradicted" ? "Contradicted" : "Unverifiable";

  const scoreColor =
    verification.trust_score >= 70 ? "#10b981"
    : verification.trust_score >= 40 ? "#f59e0b"
    : "#ef4444";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>KLAR Trust Report — ${verification.trust_score}%</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 800; color: #10b981; }
    .logo span { color: #6b7280; font-weight: 400; font-size: 14px; }
    .date { color: #9ca3af; font-size: 12px; }
    .score-card { display: flex; align-items: center; gap: 30px; background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid #e5e7eb; }
    .score { font-size: 48px; font-weight: 800; color: ${scoreColor}; }
    .score-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
    .stats { display: flex; gap: 20px; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 11px; color: #6b7280; }
    .supported { color: #10b981; }
    .unverifiable { color: #f59e0b; }
    .contradicted { color: #ef4444; }
    .section-title { font-size: 16px; font-weight: 700; margin: 30px 0 15px; color: #111827; }
    .claim { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 12px; page-break-inside: avoid; }
    .claim-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .verdict-badge { padding: 3px 10px; border-radius: 20px; color: white; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .claim-text { font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
    .reasoning { font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 8px; }
    .confidence { font-size: 11px; color: #9ca3af; }
    .sources { margin-top: 8px; }
    .source { font-size: 11px; color: #3b82f6; text-decoration: none; display: block; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
    @media print { body { padding: 20px; } .claim { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">KLAR <span>— Trust Report</span></div>
    <div class="date">Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>

  <div class="score-card">
    <div>
      <div class="score">${verification.trust_score}%</div>
      <div class="score-label">Trust Score</div>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${verification.total_claims}</div>
        <div class="stat-label">Total Claims</div>
      </div>
      <div class="stat">
        <div class="stat-value supported">${verification.supported_count}</div>
        <div class="stat-label">Supported</div>
      </div>
      <div class="stat">
        <div class="stat-value unverifiable">${verification.unverifiable_count}</div>
        <div class="stat-label">Unverifiable</div>
      </div>
      <div class="stat">
        <div class="stat-value contradicted">${verification.contradicted_count}</div>
        <div class="stat-label">Contradicted</div>
      </div>
    </div>
  </div>

  ${verification.source_url ? `<p style="margin-bottom: 20px; font-size: 13px; color: #6b7280;">Source: <a href="${escapeHtml(verification.source_url)}" style="color: #3b82f6;">${escapeHtml(verification.source_title || verification.source_url)}</a></p>` : ""}

  <div class="section-title">Individual Claims (${claimsList.length})</div>

  ${claimsList.map((claim: Record<string, unknown>) => `
    <div class="claim">
      <div class="claim-header">
        <span class="verdict-badge" style="background: ${verdictColor(claim.verdict as string)}">${verdictLabel(claim.verdict as string)}</span>
        <span class="confidence">Confidence: ${Math.round((claim.confidence as number) * 100)}%</span>
      </div>
      <div class="claim-text">${escapeHtml(claim.claim_text as string)}</div>
      <div class="reasoning">${escapeHtml(claim.reasoning as string)}</div>
      ${Array.isArray(claim.sources) && claim.sources.length > 0 ? `
        <div class="sources">
          ${(claim.sources as Array<{title: string; url: string}>).map((s) =>
            `<a class="source" href="${escapeHtml(s.url)}" target="_blank">↗ ${escapeHtml(s.title)}</a>`
          ).join("")}
        </div>
      ` : ""}
    </div>
  `).join("")}

  <div class="footer">
    <p>KLAR — Knowledge Legitimacy Audit & Review</p>
    <p>AI-Powered Verification • Report ID: ${verification.id}</p>
    <p>Processing Time: ${(verification.processing_time_ms / 1000).toFixed(1)}s</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="klar-report-${verification.trust_score}.html"`,
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
