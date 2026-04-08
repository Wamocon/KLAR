import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, hasScope } from "@/lib/security/api-key-auth";

/**
 * POST /api/extension/validate
 *
 * Lightweight API key validation endpoint for the Chrome extension.
 * Only checks if the key is valid + has "verify" scope.
 * Does NOT run the verification pipeline.
 *
 * Returns { valid: true, scopes: [...] } on success.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const auth = await authenticateApiKey(authHeader);

  if (!auth) {
    return corsResponse({ valid: false, error: "invalid_key" }, 401);
  }

  if (!hasScope(auth, "verify")) {
    return corsResponse({ valid: false, error: "missing_scope", scopes: auth.scopes }, 403);
  }

  return corsResponse({ valid: true, scopes: auth.scopes, plan: auth.plan }, 200);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function corsResponse(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}
