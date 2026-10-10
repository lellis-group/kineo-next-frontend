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
    // `/listings` is deliberately absent, while `/listings/mine` stays guarded.
    // The browse feed is the page a locum lands on to find a replacement, and
    // `GET /replacement-listings` is anonymous on the backend: redirecting a
    // signed-out reader away from it would hide the openings from the people who
    // most need to see that there are any. The practice side of the same URL
    // prefix is still a member screen and keeps the guard.
    "/listings/mine",
    "/listings/mine/:path*",
    "/practices",
    "/practices/:path*",
  ],
};
