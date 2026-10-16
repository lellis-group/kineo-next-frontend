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
    // The whole `/listings` prefix is guarded, browse feed included. It used to
    // be the one public route — a locum landing on it to find a replacement — but
    // the feed is now member-only. `/listings/:path*` already covers
    // `/listings/mine` and its detail pages, so the practice side needs no entry
    // of its own. No `/practices` entry either: there is no such route, and a
    // matcher for a page that does not exist guards nothing.
    "/listings",
    "/listings/:path*",
  ],
};
