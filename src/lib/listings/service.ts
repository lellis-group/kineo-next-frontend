/**
 * Listings service — the practice side of the product: the listings the user
 * published, the candidates who applied to them, and the owner actions.
 *
 * `notFoundAs` is used on the reads because a member without a profile has no
 * listings yet, which is an empty list rather than an error.
 */

import {
  type ApiTransport,
  apiFetch,
  buildQuery,
  notFoundAs,
} from "../api-client";
import { COUNT_KEYS, withZeroCounts, zeroCounts } from "../counts";
import type {
  ApiApplicationRow,
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

/** The owner actions on a listing this module performs. */
export type ListingActionKind = "close" | "cancel";

/** The listings page: the filtered slice plus the totals behind the chips. */
export interface MyListingsData {
  listings: MyListing[];
  page: number;
  totalPages: number;
  /** Filtered total for the active bucket (drives pagination). */
  total: number;
  /** Per-status totals over the whole collection, independent of the filter. */
  counts: ListingStatusCounts;
  /**
   * The soonest period still to come, among the postings that are in play, or
   * null when there is none.
   *
   * Server-answered, because it cannot be answered from a page: it spans every
   * posting the member owns.
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

/** Zeroed counts — for a response without the breakdown, or a brand-new user. */
function emptyCounts(): ListingStatusCounts {
  return zeroCounts(0, COUNT_KEYS.listingStatus);
}

/**
 * Page size for the candidates received on one listing. Shared by the server
 * render and the client refetch: if they disagreed, a filter change would land
 * the reader on a page that does not exist.
 */
export const LISTING_APPLICATIONS_PAGE_SIZE = 10;

/**
 * GET /replacement-listings/mine — the listings the user published, optionally
 * narrowed to a status bucket.
 *
 * `urgentOnly` is a toggle rather than a filter bucket: the endpoint has no
 * per-urgency total to put on a chip.
 */
export async function fetchMyListings(
  params: {
    statuses?: ReplacementListingStatus[];
    page?: number;
    /** Up to 500; the endpoint also bounds `page × limit ≤ 10 000`. */
    limit?: number;
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
    // Partial on the wire, so it is completed rather than cast.
    counts: withZeroCounts(raw.meta.counts, COUNT_KEYS.listingStatus),
    // Absent from a backend one release behind.
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
  /** Lets a caller abort a read it has superseded. */
  init?: RequestInit,
): Promise<ListingApplicationsData> {
  const query = buildQuery({
    page: params.page ?? 1,
    limit: params.limit ?? LISTING_APPLICATIONS_PAGE_SIZE,
    status: params.status,
  });

  const raw = await apiFetch<
    ApiPaginated<ApiApplicationRow> & {
      meta: { counts?: Partial<ReceivedApplicationCounts> };
    }
  >(
    `/applications/listing/${encodeURIComponent(listingId)}?${query}`,
    init,
    transport,
  );

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

/** PATCH /applications/:id/view — marks a candidate's application as read. */
export async function markApplicationViewed(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(
    `/applications/${encodeURIComponent(id)}/view`,
    { method: "PATCH" },
    transport,
  );
}

/** PATCH /applications/:id/shortlist — pending → shortlisted. */
export async function shortlistReceivedApplication(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(
    `/applications/${encodeURIComponent(id)}/shortlist`,
    { method: "PATCH" },
    transport,
  );
}

/**
 * PATCH /applications/:id/accept — fills the listing and rejects the other
 * active applications server-side.
 */
export async function acceptReceivedApplication(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(
    `/applications/${encodeURIComponent(id)}/accept`,
    { method: "PATCH" },
    transport,
  );
}

/** PATCH /applications/:id/reject — optional reason shared with the applicant. */
export async function rejectReceivedApplication(
  id: string,
  reason: string | undefined,
  transport?: ApiTransport,
): Promise<void> {
  const trimmed = reason?.trim();
  await apiFetch(
    `/applications/${encodeURIComponent(id)}/reject`,
    {
      method: "PATCH",
      body: JSON.stringify(trimmed ? { rejectionReason: trimmed } : {}),
    },
    transport,
  );
}

/**
 * One of the user's own listings, by id. The endpoint relaxes its status gate
 * for the owner, so drafts and cancelled postings resolve, and a 404 means the
 * listing does not exist or belongs to somebody else.
 */
export async function fetchMyListing(
  id: string,
  transport?: ApiTransport,
): Promise<MyListing> {
  const listing = await apiFetch<ApiReplacementListing>(
    `/replacement-listings/${encodeURIComponent(id)}`,
    undefined,
    transport,
  );

  return adaptMyListing(listing);
}

/**
 * PATCH /replacement-listings/:id/close — the posting leaves circulation. The
 * backend records `CLOSED_NO_CANDIDATE` when nobody was retained, `CLOSED`
 * from a filled listing.
 */
export async function closeListing(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await mutateListing(id, "close", transport);
}

/** PATCH /replacement-listings/:id/cancel — called off before it is filled. */
export async function cancelListing(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await mutateListing(id, "cancel", transport);
}

/**
 * Lets the `ApiError` through so `listingActionErrorMessage` can read its status
 * and code where the message is shown.
 */
async function mutateListing(
  id: string,
  action: ListingActionKind,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(
    `/replacement-listings/${encodeURIComponent(id)}/${action}`,
    { method: "PATCH" },
    transport,
  );
}
