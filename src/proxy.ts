import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// /goodbye edge headers (Cache-Control, Referrer-Policy, X-Robots-Tag) live in
// next.config.ts `headers()`: for static pages it applies AFTER Next's own
// cache header, which the proxy (middleware) cannot do for Cache-Control.

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile",
    "/profile/:path*",
    "/applications",
    "/applications/:path*",
    "/listings",
    "/listings/:path*",
    "/practices",
    "/practices/:path*",
  ],
};
