/**
 * Listings service — the practice side of the product: the listings the user
 * published, the candidates who applied to them, and the actions the backend
 * allows on a listing.
 *
 * Every route here is already implemented and documented server-side; this
 * module is the client that had never been written. `notFoundAs` is used on
 * the reads because a member without a profile has no listings yet, which is
 * an empty list rather than an error.
 */

import {
  ApiError,
  type ApiTransport,
  apiFetch,
  buildQuery,
  notFoundAs,
} from "../api-client";
import { errorMessage } from "../api-errors";
import { COUNT_KEYS, withZeroCounts, zeroCounts } from "../counts";
import type {
  ApiApplication,
  ApiPaginated,
  ApiReplacementListing,
  ApplicationStatus,
  ReplacementListingStatus,
} from "../types/api";
import {
  adaptMyListing,
  adaptMyListings,
  adaptReceivedApplication,
} from "./adapters";
import type {
  ListingApplicationsData,
  ListingStatusCounts,
  MyListing,
  ReceivedApplication,
  ReceivedApplicationCounts,
} from "./contracts";

/**
 * The refusal codes the backend sends on a listing write, mirrored one for one.
 *
 * `common/refusal.ts` on the other side is the source; these are the listing
 * codes of its `REFUSAL_CODES` — the application and profile ones belong to
 * screens this module does not serve. The names follow the backend's *semantics*
 * rather than its internal keys, so a rename there reads here as a rename.
 *
 * The previous mirror had drifted: five of its seven entries named a code the
 * backend no longer sends (`LISTING_NOT_A_DRAFT` for `LISTING_NOT_DRAFT`,
 * `LISTING_INVALID_PERIOD` for `LISTING_INVALID_DATES`, and so on), which is
 * why every refusal had fallen back to parsing English prose. Only the two that
 * happened to survive — `NOT_MODIFIABLE` and `FILLED_CANNOT_BE_DELETED` — ever
 * reached a reader in French.
 *
 * `LISTING_HAS_THIRD_PARTY_APPLICATIONS` is deliberately absent: the backend
 * declares it but throws it as a bare `ConflictException` with no code
 * (`common/application-guard.ts:135`), so it is answered by status, below.
 */
export const LISTING_TRANSITION_CODES = {
  NOT_DRAFT: "LISTING_NOT_DRAFT",
  NOT_MODIFIABLE: "LISTING_NOT_MODIFIABLE",
  INVALID_DATES: "LISTING_INVALID_DATES",
  NOT_CLOSEABLE: "LISTING_NOT_CLOSEABLE",
  ALREADY_CLOSED: "LISTING_ALREADY_CLOSED",
  FILLED_CANNOT_BE_DELETED: "LISTING_FILLED_CANNOT_BE_DELETED",
  QUOTA_REACHED: "LISTING_QUOTA_REACHED",
} as const;

/** The owner actions on a listing this module performs. */
export type ListingActionKind = "close" | "cancel";

/**
 * The French for each action: the infinitive the refusal sentences interpolate
 * (« clôturer », « annuler »), and the past participle the outage sentence needs
 * (« l'annonce n'a pas été clôturée »).
 *
 * English verbs once reached the reader through the generic fallback on every
 * 403 and outage, because the two sentences that interpolate them were written
 * at the call site. Deriving the participle from the infinitive instead —
 * `${verb}e` — produces « clôturée » and « annuléee », so it is spelled out.
 */
const ACTION_COPY: Record<ListingActionKind, { verb: string; done: string }> = {
  close: { verb: "clôturer", done: "clôturée" },
  cancel: { verb: "annuler", done: "annulée" },
};

/** The listings page: the filtered slice plus the totals behind the chips. */
export interface MyListingsData {
  listings: MyListing[];
  page: number;
  totalPages: number;
  /** Filtered total for the active bucket (drives pagination). */
  total: number;
  /**
   * Per-status totals over the whole collection, independent of the filter.
   * Rendered on the chips and never derived from `listings`, so switching
   * bucket cannot change the numbers.
   */
  counts: ListingStatusCounts;
  /**
   * The soonest period still to come, among the postings that are in play, or
   * null when there is none.
   *
   * Server-answered, because it cannot be answered from a page: it asks for the
   * soonest start date across every posting the member owns, and a breakdown of
   * statuses holds no dates. A client that had to find it would read every page
   * and report the soonest among them — a wrong date rather than a missing one.
   */
  nextRecruitingListing: NextRecruitingListing | null;
}

/** What the server says about the member's next replacement to cover. */
export interface NextRecruitingListing {
  id: string;
  title: string;
  /** ISO instant — formatted in the reader's locale by `formatDateRange`. */
  startDate: string;
  endDate: string;
}

/**
 * Zeroed counts — for a response without the breakdown, or a brand-new user.
 * Zeros rather than guessed numbers: the tab counters must never claim a
 * listing exists in a status the server did not confirm.
 */
function emptyCounts(): ListingStatusCounts {
  return zeroCounts(0, COUNT_KEYS.listingStatus);
}

/**
 * Page size for the candidates received on one listing.
 *
 * Lives here, next to the endpoint, for the reason the number the server rendered
 * and the number the client refetches have to be one: a filter change silently
 * changing the page size would land the reader on a page that does not exist.
 *
 * The console lists that offer a choice — the practice's own listings and the
 * member's applications — no longer have one number to agree on. Both the server
 * page and the container read the reader's choice instead (`lib/page-size.ts`),
 * which is why this constant is about the one screen that has no choice to offer.
 */
export const LISTING_APPLICATIONS_PAGE_SIZE = 10;

/**
 * GET /replacement-listings/mine — the listings the user published, optionally
 * narrowed to a status bucket.
 *
 * The bucket is resolved to backend statuses by the caller and sent as a
 * comma-separated list, so the server does the filtering and the result stays
 * correctly paginated.
 *
 * `urgentOnly` is a separate narrowing rather than a filter bucket: the endpoint
 * has no per-urgency total, so a « Urgentes (n) » chip would have to report a
 * number the server never sent. As a toggle it costs no counter and stays exact.
 */
export async function fetchMyListings(
  params: {
    statuses?: ReplacementListingStatus[];
    page?: number;
    /**
     * Page size. The endpoint takes up to 500 (`MAX_PAGE_SIZE`), raised from 100
     * so the console's own 500 choice is reachable; its other bound is
     * `page × limit ≤ 10 000`, which at this size answers the first twenty
     * pages.
     */
    limit?: number;
    /** Narrow to postings flagged urgent, on top of the status bucket. */
    urgentOnly?: boolean;
  } = {},
  transport?: ApiTransport,
): Promise<MyListingsData> {
  const query = buildQuery({
    status: params.statuses?.join(","),
    urgent: params.urgentOnly ? "true" : undefined,
    page: params.page,
    limit: params.limit,
  });
  const raw = await apiFetch<
    ApiPaginated<ApiReplacementListing> & {
      meta: {
        counts?: Partial<ListingStatusCounts>;
        nextRecruitingListing?: NextRecruitingListing | null;
      };
    }
  >(
    `/replacement-listings/mine${query ? `?${query}` : ""}`,
    undefined,
    transport,
  ).catch(notFoundAs(null));

  if (!raw) {
    return {
      listings: [],
      page: 1,
      totalPages: 0,
      total: 0,
      counts: emptyCounts(),
      nextRecruitingListing: null,
    };
  }

  return {
    listings: adaptMyListings(raw.data ?? []),
    page: raw.meta.page,
    totalPages: raw.meta.totalPages,
    total: raw.meta.total,
    // Partial on the wire (a status the backend does not know about would be
    // absent), so it is completed rather than cast.
    counts: withZeroCounts(raw.meta.counts, COUNT_KEYS.listingStatus),
    // Absent from a backend one release behind, which is "nothing to show" — the
    // same thing it is when the member has nothing coming.
    nextRecruitingListing: raw.meta.nextRecruitingListing ?? null,
  };
}

/** GET /applications/listing/:listingId — candidates who applied to a listing. */
export async function fetchListingApplications(
  listingId: string,
  params: {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
  } = {},
  transport?: ApiTransport,
  /**
   * Forwarded to the request, so a caller can cancel a read it has superseded —
   * the panel behind an expanded card, which the reader collapses or replaces
   * before the answer arrives.
   */
  init?: RequestInit,
): Promise<ListingApplicationsData> {
  const query = buildQuery({
    page: params.page ?? 1,
    limit: params.limit ?? LISTING_APPLICATIONS_PAGE_SIZE,
    status: params.status,
  });

  const raw = await apiFetch<
    ApiPaginated<ApiApplication> & {
      meta: { counts?: Partial<ReceivedApplicationCounts> };
    }
  >(`/applications/listing/${listingId}?${query}`, init, transport);

  return {
    applications: raw.data
      .map(adaptReceivedApplication)
      .filter((entry): entry is ReceivedApplication => entry !== null),
    page: raw.meta.page,
    totalPages: raw.meta.totalPages,
    total: raw.meta.total,
    counts: withZeroCounts(raw.meta.counts, COUNT_KEYS.applicationStatus),
  };
}

/**
 * One of the user's own listings, by id — the `/listings/mine/[id]` page.
 *
 * The resource endpoint answers for every status the owner can see, drafts and
 * cancelled postings included, so this is a single read and the 404 it raises is
 * the real one: the listing does not exist, or it belongs to somebody else. Both
 * are the 404 page, which is the honest answer either way.
 *
 * It is deliberately not assembled from `/replacement-listings/mine` by scanning
 * the owner's pages for a matching id. That was tried first, on the assumption
 * that the endpoint only serves postings still in circulation — the OpenAPI
 * summary says « not found or not open », and the backend does gate on `status`
 * — but it relaxes that gate for the owner, so the fallback never ran and only
 * cost a full collection read on the 404 path, which is the one request where a
 * wrong answer matters most.
 */
export async function fetchMyListing(
  id: string,
  transport?: ApiTransport,
): Promise<MyListing> {
  const listing = await apiFetch<ApiReplacementListing>(
    `/replacement-listings/${id}`,
    undefined,
    transport,
  );

  return adaptMyListing(listing);
}

/**
 * PATCH /replacement-listings/:id/close — the posting leaves circulation.
 *
 * Reachable from any status still recruiting, and the backend records which
 * outcome it was: `CLOSED_NO_CANDIDATE` when nobody was retained, `CLOSED` from
 * a filled listing. The applicant reads the difference in their rejection
 * reason, which is why the confirmation copy spells it out.
 */
export async function closeListing(id: string): Promise<void> {
  await mutateListing(id, "close");
}

/** PATCH /replacement-listings/:id/cancel — called off before it is filled. */
export async function cancelListing(id: string): Promise<void> {
  await mutateListing(id, "cancel");
}

/**
 * The write behind both owner actions.
 *
 * It lets the `ApiError` through rather than catching it to build a sentence:
 * the typed error carries the status and the refusal code, and
 * `listingActionErrorMessage` below is what turns those into French — at the
 * point where the reader is shown one. Re-wrapping here threw the type away and
 * left the hook with `Error.message`, so a caller that did not format it
 * displayed the raw `API 400 (…): Only a listing still in circulation can be
 * closed`.
 */
async function mutateListing(
  id: string,
  action: ListingActionKind,
): Promise<void> {
  await apiFetch(`/replacement-listings/${id}/${action}`, {
    method: "PATCH",
  });
}

/**
 * What each refusal code means, in French.
 *
 * A function rather than a string only where the sentence names the action: the
 * backend sends the same `LISTING_NOT_CLOSEABLE` whether the practice asked to
 * close or to cancel, and « Impossible de clôturer » on a cancel button is a
 * sentence about the wrong thing.
 *
 * Two entries are unreachable from this screen — `NOT_DRAFT`, `NOT_MODIFIABLE`,
 * `INVALID_DATES`, `FILLED_CANNOT_BE_DELETED` and `QUOTA_REACHED` belong to the
 * publish, edit, delete and create routes, which this client does not call yet.
 * They stay because the table is a mirror of the contract, not of the calls: a
 * route arriving with its French sentence ready is the point.
 *
 * `ALREADY_CLOSED` used to carry « Impossible d'annuler : elle est pourvue.
 * Clôturez-la à la place », because the backend answered a filled listing with
 * its own code. It answers `LISTING_ALREADY_CLOSED` for that case now, so the
 * sentence names every terminal status it covers and advises nothing that would
 * be wrong for one of them — and the screen never offers « Annuler » on a filled
 * listing anyway (`FILLED` is not a recruiting status).
 */
const LISTING_REFUSAL_MESSAGES: Record<
  (typeof LISTING_TRANSITION_CODES)[keyof typeof LISTING_TRANSITION_CODES],
  string | ((action: ListingActionKind) => string)
> = {
  [LISTING_TRANSITION_CODES.NOT_DRAFT]:
    "Seule une annonce en brouillon peut être publiée.",
  [LISTING_TRANSITION_CODES.NOT_MODIFIABLE]:
    "Cette annonce n'est plus modifiable : elle a quitté la diffusion.",
  [LISTING_TRANSITION_CODES.INVALID_DATES]:
    "La date de début doit précéder la date de fin.",
  [LISTING_TRANSITION_CODES.NOT_CLOSEABLE]: (action) =>
    `Impossible de ${ACTION_COPY[action].verb} l'annonce : elle n'est plus en diffusion.`,
  [LISTING_TRANSITION_CODES.ALREADY_CLOSED]: (action) =>
    `Impossible de ${ACTION_COPY[action].verb} l'annonce : elle a quitté la diffusion (clôturée, annulée ou pourvue).`,
  [LISTING_TRANSITION_CODES.FILLED_CANNOT_BE_DELETED]:
    "Impossible de supprimer l'annonce : elle est pourvue. Clôturez-la à la place.",
  [LISTING_TRANSITION_CODES.QUOTA_REACHED]:
    "Vous avez atteint le nombre maximal d'annonces. Libérez-en une ou contactez-nous.",
};

/**
 * A refused or failed owner action, in French.
 *
 * Pure: it reads the typed error and returns a sentence, which is what makes it
 * testable per code. The caller decides when to show it — `useListingAction`
 * shows it, and redirects first on an expired session.
 *
 * The code is asked before the status, because it is the more specific of the
 * two: a 400 says the state of the data refused the write, and only the code
 * says *which* state. A code this client does not know degrades to a sentence
 * about the current state, never to a wrong one.
 *
 * The English `message` the backend sends alongside the code is never parsed.
 * It used to be, with six regexes over the wording; a reword on the server
 * silently turned a precise refusal into « Veuillez réessayer », which is advice
 * that cannot help a posting that is already closed.
 */
export function listingActionErrorMessage(
  error: unknown,
  action: ListingActionKind,
): string {
  const { verb, done } = ACTION_COPY[action];

  if (error instanceof ApiError) {
    const byCode =
      error.code === undefined
        ? undefined
        : LISTING_REFUSAL_MESSAGES[
            error.code as keyof typeof LISTING_REFUSAL_MESSAGES
          ];
    if (byCode !== undefined) {
      return typeof byCode === "function" ? byCode(action) : byCode;
    }

    if (error.status === 404) {
      return "Cette annonce n'existe plus.";
    }
    if (error.status === 403) {
      // Two unrelated refusals share this status since the backend widened
      // `EmailVerifiedGuard` to every write: not the owner, or an address that
      // has not been confirmed. The generic copy names both, and a signed-out
      // reader is not told to retry a request that could never succeed.
      return errorMessage(error, {
        forbidden:
          "Vous n'êtes pas le propriétaire de cette annonce, ou votre adresse e-mail n'est pas validée.",
      });
    }
    if (error.status === 409) {
      // The only 409 a listing write raises: another candidate's application is
      // still active and the cascade would take it (`common/application-guard.ts`).
      // It arrives without a code, so this is answered by status alone.
      return `Impossible de ${verb} l'annonce : des candidatures d'autres candidats lui sont encore actives.`;
    }
    // A 400/409/422 carrying a code this client does not know. The state of the
    // data refused the action; retrying unchanged will refuse again, so the
    // sentence says that rather than suggesting a second attempt.
    if (error.status === 400 || error.status === 409 || error.status === 422) {
      return `Impossible de ${verb} l'annonce dans son état actuel.`;
    }
  }

  // 401 included: the hook redirects before ever asking for a sentence, so a
  // session that expired mid-write is not reported as a failed action.
  return errorMessage(error, {
    unavailable: `Impossible de ${verb} l'annonce pour le moment. Veuillez réessayer.`,
    "service-down": `Le service est hors service : l'annonce n'a pas été ${done}. Réessayez dans quelques minutes.`,
  });
}

/**
 * A failed *read* on a listing, in French, with the 403 case spelled out.
 *
 * The sibling of `listingActionErrorMessage`, and separate from it because the
 * two endpoints answer 403 for different reasons and the reader needs a different
 * way out of each.
 *
 * The candidates endpoint answers a bare English « You do not own this listing »
 * on a 403, which is the same string the service layer maps for the *write*
 * actions. Surfacing `err.message` instead put that sentence — plus the
 * `API 403 (/applications/listing/…):` prefix `apiFetch` builds — in front of a
 * French-speaking practice. `errorMessage` classifies the typed status; only the
 * 403 needed domain wording, because the generic « action non autorisée » copy
 * is about the unverified-email guard and would have sent them to check an
 * address that is fine.
 */
export function listingReadErrorMessage(error: unknown): string {
  return errorMessage(error, {
    forbidden:
      "Cette annonce ne vous appartient pas, ou elle n'existe plus. Retournez à vos annonces.",
  });
}
