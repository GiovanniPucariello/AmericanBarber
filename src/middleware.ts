import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// This is a UX convenience layer only - the real enforcement is RLS plus
// each Server Action re-checking authorization server-side (section 53).
// Role-based redirects (customer -> /app, hairdresser -> /hairdresser,
// admin -> /admin) land once organization membership exists (Phase 6).
const PROTECTED_PREFIXES = ["/app", "/hairdresser", "/admin"];
const SIGNED_OUT_ONLY_PATHS = ["/login", "/register", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  // Exact match on /reset-password (the request form), not
  // /reset-password/update - that page needs the recovery session a
  // password-reset email link establishes.
  const isSignedOutOnlyPath = SIGNED_OUT_ONLY_PATHS.includes(pathname);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isSignedOutOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
