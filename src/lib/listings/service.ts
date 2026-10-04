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
 * Machine-readable discriminators for the listing transition refusals.
 *
 * Mirrors the backend's `LISTING_TRANSITION_CODES`. Every one of these used to
 * reach this client as English prose only, and `translateStatusMessage` below
 * branched on the wording — "only open or filled", "already closed or
 * cancelled". Rewording a message server-side silently disabled the
 * translation, and a practice was told to "try again" for a refusal that has a
 * definite cause and a definite way out. That already happened once: the
 * backend reworded both messages when `close` became reachable from a listing
 * that was still recruiting, and the regexes stopped matching.
 *
 * The message text stays as a fallback for a backend one deploy behind, the
 * same way `account-deletion-service.ts` keeps its `blocked` case.
 */
export const LISTING_TRANSITION_CODES = {
  NOT_A_DRAFT: "LISTING_NOT_A_DRAFT",
  NOT_MODIFIABLE: "LISTING_NOT_MODIFIABLE",
  INVALID_PERIOD: "LISTING_INVALID_PERIOD",
  FILLED_CANNOT_BE_DELETED: "LISTING_FILLED_CANNOT_BE_DELETED",
  NOT_IN_CIRCULATION: "LISTING_NOT_IN_CIRCULATION",
  FILLED_CANNOT_BE_CANCELLED: "LISTING_FILLED_CANNOT_BE_CANCELLED",
  ALREADY_TERMINAL: "LISTING_ALREADY_TERMINAL",
} as const;

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
 * Page size for the listings list, server page and client container alike.
 *
 * Lives here, next to the endpoint, for the reason `APPLICATIONS_PAGE_SIZE` does
 * on the other side: the number the server rendered and the number the client
 * refetches have to be one number, or a filter change silently changes the
 * page size and the reader lands on a page that does not exist.
 */
export const MY_LISTINGS_PAGE_SIZE = 10;

/** Same, for the candidates received on one listing. */
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
    /** Page size, capped at 100 by the endpoint. */
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
      meta: { counts?: Partial<ListingStatusCounts> };
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
  >(`/applications/listing/${listingId}?${query}`, undefined, transport);

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
  // French verb: it is interpolated straight into the user-facing sentence,
  // and the English one leaked through on every 403 and generic failure.
  // `done` is the past participle, needed separately: deriving it as `${verb}e`
  // would produce "clôturee" and "annulee" — the first over-accented, the
  // second without the e the past tense needs.
  await mutateListing(id, "close", "clôturer", "clôturée");
}

/** PATCH /replacement-listings/:id/cancel — called off before it is filled. */
export async function cancelListing(id: string): Promise<void> {
  await mutateListing(id, "cancel", "annuler", "annulée");
}

async function mutateListing(
  id: string,
  action: "close" | "cancel",
  verb: string,
  done: string,
): Promise<void> {
  try {
    await apiFetch(`/replacement-listings/${id}/${action}`, {
      method: "PATCH",
    });
  } catch (error) {
    throw new Error(mapListingActionError(error, verb, done));
  }
}

function mapListingActionError(
  error: unknown,
  verb: string,
  done: string,
): string {
  if (error instanceof ApiError) {
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
      return `Impossible de ${verb} l'annonce : des candidatures d'autres candidats sont encore actives.`;
    }
    if (error.status === 400) {
      return (
        translateByCode(error.code, verb) ??
        translateStatusMessage(error.apiMessage ?? "", verb)
      );
    }
  }
  // Everything else — including the 401 the branches above do not cover.
  return errorMessage(error, {
    unavailable: `Impossible de ${verb} l'annonce pour le moment. Veuillez réessayer.`,
    "service-down": `Le service est hors service : l'annonce n'a pas été ${done}. Réessayez dans quelques minutes.`,
  });
}

/**
 * The refusal, in French, from the backend's machine-readable code.
 *
 * Returns undefined for an unknown code so the caller falls back to the message
 * text rather than guessing: a new code from a newer backend must degrade to a
 * sentence, never to a wrong one.
 */
function translateByCode(
  code: string | undefined,
  verb: string,
): string | undefined {
  switch (code) {
    case LISTING_TRANSITION_CODES.NOT_A_DRAFT:
      return "Seule une annonce en brouillon peut être publiée.";
    case LISTING_TRANSITION_CODES.NOT_MODIFIABLE:
      return "Cette annonce n'est plus modifiable : elle a quitté la diffusion.";
    case LISTING_TRANSITION_CODES.INVALID_PERIOD:
      return "La date de début doit précéder la date de fin.";
    case LISTING_TRANSITION_CODES.FILLED_CANNOT_BE_DELETED:
      return "Impossible de supprimer l'annonce : elle est pourvue. Clôturez-la à la place.";
    case LISTING_TRANSITION_CODES.NOT_IN_CIRCULATION:
      return `Impossible de ${verb} l'annonce : elle n'est plus en diffusion.`;
    case LISTING_TRANSITION_CODES.FILLED_CANNOT_BE_CANCELLED:
      return "Impossible d'annuler l'annonce : elle est pourvue. Clôturez-la à la place.";
    case LISTING_TRANSITION_CODES.ALREADY_TERMINAL:
      return "Cette annonce est déjà clôturée ou annulée.";
    default:
      return undefined;
  }
}

/**
 * Fallback for a backend that sends no `code` — one deploy behind, or a route
 * that has not been converted yet.
 *
 * The backend states transition refusals in English ("Only a listing still in
 * circulation can be closed"). Rather than surface that to a French-speaking
 * practice, map the known ones and keep a generic fallback.
 *
 * Every pattern below is matched case-insensitively against the *current*
 * wording, and deliberately tolerates the older phrasing too: a reword must not
 * turn this into dead code, because the `code` path is the real contract and
 * this is only insurance against a rolling deploy.
 */
function translateStatusMessage(message: string, verb: string): string {
  if (/filled listing cannot be deleted/i.test(message)) {
    return "Impossible de supprimer l'annonce : elle est pourvue. Clôturez-la à la place.";
  }
  if (/still in circulation|only open or filled/i.test(message)) {
    return `Impossible de ${verb} l'annonce : elle n'est plus en diffusion.`;
  }
  if (/already closed or cancelled|already closed or canceled/i.test(message)) {
    return "Cette annonce est déjà clôturée ou annulée.";
  }
  if (/filled listing cannot be cancelled/i.test(message)) {
    return "Impossible d'annuler l'annonce : elle est pourvue. Clôturez-la à la place.";
  }
  if (/only draft listings can be published/i.test(message)) {
    return "Seule une annonce en brouillon peut être publiée.";
  }
  if (/no longer be modified/i.test(message)) {
    return "Cette annonce n'est plus modifiable : elle a quitté la diffusion.";
  }
  return `Impossible de ${verb} l'annonce pour le moment. Veuillez réessayer.`;
}

/**
 * A failed *read* on a listing, in French, with the 403 case spelled out.
 *
 * The sibling of `mapListingActionError`, and separate from it because the two
 * endpoints answer 403 for different reasons and the reader needs a different
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
