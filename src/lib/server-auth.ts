/**
 * Server-side auth state for the shell (RSC only).
 *
 * `status` is the only thing the UI branches on. There is no "half signed
 * in", but there is "could not tell": see `unavailable` below.
 */

import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { cache } from "react";
import { ApiError } from "./api-client";
import { serverTransport } from "./api-transport.server";
import { fetchMyProfile } from "./profile-service";
import type { ApiUser, ProfileType } from "./types/api";

/**
 * - `anonymous` — no session cookie, or the backend answered that the session
 *   is not one (`200` with no user, or `401`).
 * - `member` — a session exists. `role` may still be null: the user has not
 *   created a profile yet, which is a legitimate onboarding state and not an
 *   error.
 * - `unavailable` — a cookie is present but the session could not be read:
 *   rate-limited (`429`), a backend error, or a timeout. Nothing is known
 *   about the reader, and above all *not* that they are signed out.
 *
 * `unavailable` exists because folding it into `anonymous` signed people out
 * on a busy backend. `get-session` is rate-limited to about twenty calls a
 * minute per address, every page load spends one on the server and one in the
 * browser, and a reader browsing at a normal pace hit the limit: their header
 * switched to « Se connecter », `/` showed the marketing page and `/profile`
 * sent them to `/signin` — all while their session was perfectly valid.
 */
export type ServerAuthState =
  | { status: "anonymous" }
  | { status: "member"; name: string; role: ProfileType | null; user: ApiUser }
  | { status: "unavailable" };

const ANONYMOUS: ServerAuthState = { status: "anonymous" };
const UNAVAILABLE: ServerAuthState = { status: "unavailable" };

/** A session read that hangs must not hold a page: the header falls back first. */
const SESSION_TIMEOUT_MS = 10_000;

/**
 * Cached per request: the layout and the page both read it.
 *
 * The session and the profile are asked for together, not one after the other:
 * the profile read needs only the cookie, and on a refused session it answers
 * 401, which the `.catch` below turns into "no role" — the same thing the
 * sequential version concluded, one round-trip later.
 */
export const fetchServerAuth = cache(async (): Promise<ServerAuthState> => {
  // No cookie: definitive, no network call.
  if (!getSessionCookie(await headers())) {
    return ANONYMOUS;
  }

  // Three outcomes, kept apart (see `ServerAuthState`):
  // - the backend answers and names a user → member;
  // - it answers that there is none (`200` with no user, `401`) → anonymous,
  //   which is what stops the header from showing account controls for a
  //   cookie the backend no longer honours;
  // - it does not answer — rate limit, `5xx`, timeout, cut connection →
  //   unavailable. Not thrown: a header is not worth failing a page load over,
  //   and each page decides what an unknown session means for it.
  //
  // The role is best-effort for the same reason. `fetchMyProfile` only softens
  // a 404, so the header needs its own floor or an outage would escalate into
  // the route's error boundary instead of staying a header.
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
 * The session as a page that needs to know it: a member, or anonymous.
 *
 * `unavailable` is thrown as the `429`/`5xx` it stands for, so the route's
 * error boundary offers « Réessayer ». The alternatives were both wrong for a
 * reader whose session is valid: redirecting to `/signin` asks them to sign in
 * again, and rendering the anonymous page shows them the marketing site.
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
