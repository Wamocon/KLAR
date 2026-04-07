import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/rag/ingest";
import { z } from "zod/v4";

const ingestSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(50).max(50000),
  source_url: z.string().url().optional(),
  source_type: z.enum(["web", "wikipedia", "academic", "government", "news", "fact_check", "manual"]).optional(),
  domain: z.string().max(50).optional(),
  language: z.string().max(5).optional(),
  credibility_score: z.number().min(0).max(1).optional(),
});

/**
 * POST: Ingest a document into the knowledge base.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const docId = await ingestDocument({
    title: parsed.data.title,
    content: parsed.data.content,
    sourceUrl: parsed.data.source_url,
    sourceType: parsed.data.source_type,
    domain: parsed.data.domain,
    language: parsed.data.language,
    credibilityScore: parsed.data.credibility_score,
  });

  if (!docId) {
    return NextResponse.json({ error: "Failed to ingest document" }, { status: 500 });
  }

  return NextResponse.json({ id: docId, status: "ingested" }, { status: 201 });
}

/**
 * GET: List knowledge documents (admin only).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data: docs, error } = await supabase
    .from("knowledge_documents")
    .select("id, title, source_type, domain, language, credibility_score, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  return NextResponse.json({ documents: docs || [] });
}
