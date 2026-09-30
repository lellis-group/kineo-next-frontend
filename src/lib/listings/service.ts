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
  notFoundAs,
} from "../api-client";
import { errorMessage } from "../api-errors";
import type {
  ApiApplication,
  ApiPaginated,
  ApiReplacementListing,
  ApplicationStatus,
  ReplacementListingStatus,
} from "../types/api";
import { adaptMyListings, adaptReceivedApplication } from "./adapters";
import type {
  ListingApplicationsData,
  ListingStatusCounts,
  MyListing,
  ReceivedApplication,
  ReceivedApplicationCounts,
} from "./contracts";

/**
 * Fallback for a response without the status breakdown. Zeros rather than
 * guessed numbers: the tab counters must never claim a candidate exists in a
 * status the server did not confirm.
 */
const EMPTY_APPLICATION_COUNTS: ReceivedApplicationCounts = {
  total: 0,
  PENDING: 0,
  SHORTLISTED: 0,
  ACCEPTED: 0,
  REJECTED: 0,
  WITHDRAWN: 0,
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
}

/** Zeroed counts — for a response without the breakdown, or a brand-new user. */
function emptyCounts(): ListingStatusCounts {
  return {
    total: 0,
    DRAFT: 0,
    OPEN: 0,
    IN_DISCUSSION: 0,
    FULL: 0,
    FILLED: 0,
    CLOSED: 0,
    CANCELLED: 0,
  };
}

/**
 * GET /replacement-listings/mine — the listings the user published, optionally
 * narrowed to a status bucket.
 *
 * The bucket is resolved to backend statuses by the caller and sent as a
 * comma-separated list, so the server does the filtering and the result stays
 * correctly paginated.
 */
export async function fetchMyListings(
  params: {
    statuses?: ReplacementListingStatus[];
    page?: number;
    /** Page size, capped at 100 by the endpoint. */
    limit?: number;
  } = {},
  transport?: ApiTransport,
): Promise<MyListingsData> {
  const searchParams = new URLSearchParams();

  if (params.statuses?.length) {
    searchParams.set("status", params.statuses.join(","));
  }
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
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
    counts: { ...emptyCounts(), ...raw.meta.counts },
  };
}

/** GET /applications/listing/:listingId — candidates who applied to a listing. */
export async function fetchListingApplications(
  listingId: string,
  params: { page?: number; limit?: number; status?: ApplicationStatus } = {},
  transport?: ApiTransport,
): Promise<ListingApplicationsData> {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });

  if (params.status) {
    searchParams.set("status", params.status);
  }

  const raw = await apiFetch<
    ApiPaginated<ApiApplication> & {
      meta: { counts?: Partial<ReceivedApplicationCounts> };
    }
  >(`/applications/listing/${listingId}?${searchParams}`, undefined, transport);

  return {
    applications: raw.data
      .map(adaptReceivedApplication)
      .filter((entry): entry is ReceivedApplication => entry !== null),
    page: raw.meta.page,
    totalPages: raw.meta.totalPages,
    total: raw.meta.total,
    counts: { ...EMPTY_APPLICATION_COUNTS, ...raw.meta.counts },
  };
}

/** PATCH /replacement-listings/:id/close — the replacement is done. */
export async function closeListing(id: string): Promise<void> {
  // French verb: it is interpolated straight into the user-facing sentence,
  // and the English one leaked through on every 403 and generic failure.
  await mutateListing(id, "close", "clôturer");
}

/** PATCH /replacement-listings/:id/cancel — called off before it is filled. */
export async function cancelListing(id: string): Promise<void> {
  await mutateListing(id, "cancel", "annuler");
}

async function mutateListing(
  id: string,
  action: "close" | "cancel",
  verb: string,
): Promise<void> {
  try {
    await apiFetch(`/replacement-listings/${id}/${action}`, {
      method: "PATCH",
    });
  } catch (error) {
    throw new Error(mapListingActionError(error, verb));
  }
}

function mapListingActionError(error: unknown, verb: string): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "Cette annonce n'existe plus.";
    }
    if (error.status === 403) {
      return "Vous n'êtes pas le propriétaire de cette annonce.";
    }
    if (error.status === 409) {
      return `Impossible de ${verb} l'annonce : des candidatures d'autres candidats sont encore actives.`;
    }
    // The backend refuses impossible transitions with a 400 whose message is
    // the only thing that explains which one was attempted.
    if (error.status === 400 && error.apiMessage) {
      return translateStatusMessage(error.apiMessage, verb);
    }
  }
  // Everything else — including the 401 the branches above do not cover, which
  // previously fell through to "please try again" and asked a signed-out reader
  // to retry a request that could never succeed.
  return errorMessage(error, {
    unavailable: `Impossible de ${verb} l'annonce pour le moment. Veuillez réessayer.`,
  });
}

/**
 * The backend states transition refusals in English ("Only open or filled
 * listings can be closed"). Rather than surface that to a French-speaking
 * practice, map the known ones and keep a generic fallback.
 *
 * The "pending applications" case is absent on purpose: it is answered from the
 * 409 above, which returns before ever reaching here, so the branch could only
 * ever be dead code reading as if it were the guard.
 */
function translateStatusMessage(message: string, verb: string): string {
  if (/filled listing cannot be deleted/i.test(message)) {
    return "Impossible de supprimer l'annonce : elle est pourvue. Clôturez-la à la place.";
  }
  if (/only open or filled/i.test(message)) {
    return "Impossible de clôturer l'annonce : elle n'est ni ouverte ni pourvue.";
  }
  if (/already closed or cancelled/i.test(message)) {
    return "Cette annonce est déjà clôturée ou annulée.";
  }
  return `Impossible de ${verb} l'annonce pour le moment. Veuillez réessayer.`;
}
