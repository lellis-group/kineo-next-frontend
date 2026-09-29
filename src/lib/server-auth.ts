/**
 * Server-side auth state for the shell (RSC only).
 *
 * One fetch, one shape. The header used to read the session and the role from
 * two independent helpers with two independent failure modes, so the nav could
 * render as "anonymous", then as "member with the default role", then settle
 * on the real role — three different headers for one page load.
 *
 * `status` is the only thing the UI branches on, and it has exactly three
 * values, so there is no such thing as "half signed in".
 */

import { headers } from "next/headers";
import { cache } from "react";
import { getSessionCookie } from "./auth";
import type { ApiProfile, ProfileType } from "./types/api";

/**
 * - `anonymous` — no session cookie, or the backend refused the session.
 * - `member` — a session exists. `role` may still be null: the user has not
 *   created a profile yet, which is a legitimate onboarding state and not an
 *   error.
 */
export type ServerAuthState =
  | { status: "anonymous" }
  | { status: "member"; name: string; role: ProfileType | null };

const ANONYMOUS: ServerAuthState = { status: "anonymous" };

/** Cached per request: the layout and the page both read it. */
export const fetchServerAuth = cache(async (): Promise<ServerAuthState> => {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";

  // No cookie: definitive, no network call.
  if (!getSessionCookie(requestHeaders)) {
    return ANONYMOUS;
  }

  const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const origin = `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${
    requestHeaders.get("host") ?? "localhost:3001"
  }`;
  const call = async <T>(path: string): Promise<T | null> => {
    try {
      const response = await fetch(`${backendURL ?? origin}${path}`, {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      });
      return response.ok ? ((await response.json()) as T) : null;
    } catch {
      return null;
    }
  };

  const session = await call<{ user?: { name?: string | null } } | null>(
    "/api/auth/get-session",
  );

  // A cookie without a valid session is not a session: treating it as
  // anonymous here is what stops the header from showing account controls for
  // a user who is not signed in.
  if (!session?.user) {
    return ANONYMOUS;
  }

  // The role is best-effort. A failure here must not cost the member their
  // whole header — it only downgrades the nav to the discovery links.
  const profile = await call<ApiProfile | null>("/profile/me");

  return {
    status: "member",
    name: session.user.name?.trim() || "Professionnel",
    role: profile?.profileType ?? null,
  };
});
