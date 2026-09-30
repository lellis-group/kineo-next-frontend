import { notFound, redirect } from "next/navigation";
import { ApiError } from "./api-client";

/**
 * Session handling for server-side reads.
 *
 * Moving the data fetches out of the client containers took their 401 handling
 * with them: the container used to catch the rejection and redirect, but a
 * server component `await`ing the same call just let it propagate to the route
 * error boundary, so an expired session produced a generic 500 page instead of
 * the sign-in screen. These keep the behaviour the readers already had.
 *
 * Both send an expired session to `/signin`, never `/signup` — the account still
 * exists, they hold its credentials, and landing on « Créer un compte » reads as
 * being asked to register again. See the same reasoning on sign-out in
 * `app-header.tsx`.
 */

/**
 * Runs a read that requires a member.
 *
 * The proxy only checks that a session cookie is *present*; the backend decides
 * whether it is still valid, so the authoritative answer can only come from a
 * real request. Anything other than a 401 is left to propagate — a 500 or a cut
 * connection is a fault worth showing, not a reason to pretend the reader signed
 * out.
 */
export async function requireMember<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/signin");
    }
    throw error;
  }
}

/**
 * As `requireMember`, and a row that is genuinely absent renders the 404 page.
 *
 * Order matters: 401 is checked first so an unauthenticated reader is not told
 * whether the id they guessed exists. This is a real 404, not an outage — the
 * application was deleted, or belongs to somebody else — and the container's
 * generic error card used to describe that as a temporary service failure.
 */
export async function requireExisting<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect("/signin");
      }
      if (error.status === 404) {
        notFound();
      }
    }
    throw error;
  }
}
