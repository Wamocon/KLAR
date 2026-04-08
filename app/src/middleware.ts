import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware entirely for the landing page
  if (pathname === "/lp") {
    return NextResponse.next();
  }

  // Redirect /en/lp or /de/lp to /lp (landing page is locale-independent)
  if (/^\/(en|de)\/lp\/?$/.test(pathname)) {
    return NextResponse.redirect(new URL("/lp", request.url));
  }

  // Update Supabase session first
  const supabaseResponse = await updateSession(request);

  // Then run intl middleware
  const intlResponse = intlMiddleware(request);

  // Inject security headers
  intlResponse.headers.set("X-Content-Type-Options", "nosniff");
  intlResponse.headers.set("X-Frame-Options", "DENY");
  intlResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  intlResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    intlResponse.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // Merge cookies from supabase response into intl response (preserve options)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    "/",
    "/(de|en)/:path*",
    "/((?!api|lp|_next|_vercel|.*\\..*).*)",
  ],
};
