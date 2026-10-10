/**
 * Server-side auth state for the shell (RSC only).
 *
 * `status` is the only thing the UI branches on, and it has exactly two
 * members, so there is no such thing as "half signed in".
 */

import { getSessionCookie } from "better-auth/cookies";
import { cache } from "react";
import { serverRequestTarget, serverTransport } from "./api-transport.server";
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

/**
 * Cached per request: the layout and the page both read it. Both go through this
 * app's own `/api/*` proxy, exactly like every other server read
 * (`api-transport.server.ts`).
 */
export const fetchServerAuth = cache(async (): Promise<ServerAuthState> => {
  const {
    origin,
    cookie,
    headers: requestHeaders,
  } = await serverRequestTarget();

  // No cookie: definitive, no network call.
  if (!getSessionCookie(requestHeaders)) {
    return ANONYMOUS;
  }

  // A cookie that the backend refuses is not a session: treating it as
  // anonymous here is what stops the header from showing account controls for a
  // user who is not signed in. Anything other than a refusal — a cut connection,
  // a backend-down 502 — is also reported as anonymous rather than thrown,
  // because a header is not worth failing a page load over.
  let session: { user?: ApiUser } | null = null;
  try {
    const response = await fetch(`${origin}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    session = response.ok ? await response.json() : null;
  } catch {
    session = null;
  }

  const user = session?.user;
  if (!user) {
    return ANONYMOUS;
  }

  // The role is best-effort. A failure here must not cost the member their
  // whole header — it only downgrades the nav to the discovery links. The
  // `.catch` is what makes it best-effort: `fetchMyProfile` only softens a 404,
  // so the header needs its own floor or an outage would escalate into the
  // route's error boundary instead of staying a header.
  const profile = await fetchMyProfile(serverTransport).catch(() => null);

  return {
    status: "member",
    name: user.name?.trim() || "Professionnel",
    role: profile?.profileType ?? null,
    user,
  };
});
