/**
 * Server-side auth state for the shell (RSC only).
 *
 * `status` is the only thing the UI branches on, and it has exactly two
 * members, so there is no such thing as "half signed in".
 */

import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { cache } from "react";
import { serverTransport } from "./api-transport.server";
import { fetchMyProfile } from "./profile-service";
import type { ApiUser, ProfileType } from "./types/api";

/**
 * - `anonymous` — no session cookie, or the backend refused the session.
 * - `member` — a session exists. `role` may still be null: the user has not
 *   created a profile yet, which is a legitimate onboarding state and not an
 *   error.
 */
export type ServerAuthState =
  | { status: "anonymous" }
  | { status: "member"; name: string; role: ProfileType | null; user: ApiUser };

const ANONYMOUS: ServerAuthState = { status: "anonymous" };

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

  // A cookie that the backend refuses is not a session: treating it as
  // anonymous here is what stops the header from showing account controls for a
  // user who is not signed in. Anything other than a refusal — a cut connection,
  // a backend-down 502 — is also reported as anonymous rather than thrown,
  // because a header is not worth failing a page load over.
  //
  // The role is best-effort for the same reason. `fetchMyProfile` only softens
  // a 404, so the header needs its own floor or an outage would escalate into
  // the route's error boundary instead of staying a header.
  const [session, profile] = await Promise.all([
    serverTransport("/api/auth/get-session", {
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ user?: ApiUser } | null>)
          : null,
      )
      .catch(() => null),
    fetchMyProfile(serverTransport).catch(() => null),
  ]);

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
