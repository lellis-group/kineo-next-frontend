/** Server-side auth state for the shell (RSC only). */

import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { cache } from "react";
import { ApiError } from "./api-client";
import { serverTransport } from "./api-transport.server";
import { fetchMyProfile } from "./profile-service";
import type { ApiUser, ProfileType } from "./types/api";

/**
 * - `anonymous` — no session cookie, or the backend says the session is not one.
 * - `member` — a session exists; `role` is null until a profile is created.
 * - `unavailable` — a cookie is present but the session could not be read
 *   (429, 5xx, timeout). Not the same as signed out: `get-session` is
 *   rate-limited, and folding this into `anonymous` signed valid readers out.
 */
export type ServerAuthState =
  | { status: "anonymous" }
  | { status: "member"; name: string; role: ProfileType | null; user: ApiUser }
  | { status: "unavailable" };

const ANONYMOUS: ServerAuthState = { status: "anonymous" };
const UNAVAILABLE: ServerAuthState = { status: "unavailable" };

/** A session read that hangs must not hold a page: the header falls back first. */
const SESSION_TIMEOUT_MS = 10_000;

/** Cached per request. Session and profile are read in parallel. */
export const fetchServerAuth = cache(async (): Promise<ServerAuthState> => {
  // No cookie: definitive, no network call.
  if (!getSessionCookie(await headers())) {
    return ANONYMOUS;
  }

  // Not thrown when unavailable: each page decides what an unknown session
  // means. The role is best-effort, so an outage stays a header problem.
  const [session, profile] = await Promise.all([
    readSession(),
    fetchMyProfile(serverTransport).catch(() => null),
  ]);

  if (session === "unavailable") {
    return UNAVAILABLE;
  }

  const user = session?.user;
  if (!user) {
    return ANONYMOUS;
  }

  return {
    status: "member",
    name: user.name?.trim() || "Professionnel",
    role: profile?.profileType ?? null,
    user,
  };
});

async function readSession(): Promise<
  { user?: ApiUser } | null | "unavailable"
> {
  try {
    const response = await serverTransport("/api/auth/get-session", {
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });
    if (response.status === 401) return null;
    if (!response.ok) return "unavailable";
    return (await response.json()) as { user?: ApiUser } | null;
  } catch {
    return "unavailable";
  }
}

/**
 * The session for a page that must know it. `unavailable` is thrown as a 429,
 * so the error boundary offers « Réessayer » rather than a sign-in or the
 * marketing page.
 */
export async function fetchKnownServerAuth(): Promise<
  Exclude<ServerAuthState, { status: "unavailable" }>
> {
  const auth = await fetchServerAuth();
  if (auth.status === "unavailable") {
    throw new ApiError(429, "/api/auth/get-session");
  }
  return auth;
}
