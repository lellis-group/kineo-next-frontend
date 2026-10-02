import { notFound, redirect } from "next/navigation";
import { ApiError } from "./api-client";

/**
 * Session handling for server-side reads.
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
 *
 * 403 is folded into the same page, and that is the whole point of checking it
 * here. The backend is not consistent about how it says "this is not yours":
 * `GET /applications/:id` answers 404 (`assertAccess` reuses the not-found
 * branch), while `GET /applications/listing/:listingId` — the candidates a
 * practice received on one of its postings — answers a 403 « You do not own
 * this listing ». A reader who guessed somebody else's listing id therefore hit
 * an unhandled `ApiError` and the route crashed on the raw framework error
 * screen instead of a page. Same meaning, so same destination here: the caller
 * states which statuses it accepts, the backend states which it sends.
 *
 * Answering 404 rather than « 403 » also keeps the id from being confirmed: a
 * page saying « cette annonce existe mais pas pour vous » already tells a
 * stranger that it exists.
 */
export async function requireExisting<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect("/signin");
      }
      if (error.status === 403 || error.status === 404) {
        notFound();
      }
    }
    throw error;
  }
}
