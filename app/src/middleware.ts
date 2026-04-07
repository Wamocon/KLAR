import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Update Supabase session first
  const supabaseResponse = await updateSession(request);

  // Then run intl middleware
  const intlResponse = intlMiddleware(request);

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
