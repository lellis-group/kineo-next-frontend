import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// /goodbye's headers live in next.config.ts `headers()`: the proxy can't
// override Cache-Control for static pages.

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
    // Covers the browse feed, `/listings/mine` and their detail pages.
    "/listings",
    "/listings/:path*",
  ],
};
