/**
 * Listings service — the practice side of the product: the listings the user
 * published, the candidates who applied to them, and the actions the backend
 * allows on a listing.
 *
 * Every route here is implemented and documented server-side; this module is
 * the client. `notFoundAs` is used on the reads because a member without a
 * profile has no listings yet, which is an empty list rather than an error.
 */

import {
  type ApiTransport,
  apiFetch,
  buildQuery,
  notFoundAs,
} from "../api-client";
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

/** The owner actions on a listing this module performs. */
export type ListingActionKind = "close" | "cancel";

/**
 * The French for each action: the infinitive the refusal sentences interpolate
 * (« clôturer », « annuler »), and the past participle the outage sentence needs
 * (« l'annonce n'a pas été clôturée »).
 *
 * Both forms live here rather than at the call site, so no English verb can
 * reach the reader through the generic fallback. Deriving the participle from
 * the infinitive — `${verb}e` — produces « clôturée » and « annuléee », so it is
 * spelled out.
 */
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
 * member's applications — have no fixed number to agree on. Both the server
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
 * PATCH /applications/:id — the decisions the listing's owner takes on one
 * application it received.
 *
 * The views re-read both halves after a decision instead of patching a row
 * locally, because accepting fills the listing and rejects the siblings in the
 * same transaction — beyond anything a local row update could keep in step.
 *
 * Eligibility stays with the backend: it is what checks ownership (403), an
 * application that moved between render and submit (400
 * APPLICATION_NOT_SHORTLISTABLE / NOT_ACCEPTABLE / NOT_REJECTABLE), and a
 * listing that left circulation before an acceptance landed (400
 * APPLICATION_LISTING_NOT_ACCEPTING); `applicationDecisionErrorMessage` turns
 * each into a French sentence. All four answer 200 with the stored row, and it
 * is the re-read the reader sees — the body carries no new information.
 */

/** PATCH /applications/:id/view — marks a candidate's application as read. */
export async function markApplicationViewed(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(`/applications/${id}/view`, { method: "PATCH" }, transport);
}

/** PATCH /applications/:id/shortlist — pending → shortlisted. */
export async function shortlistReceivedApplication(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(
    `/applications/${id}/shortlist`,
    { method: "PATCH" },
    transport,
  );
}

/**
 * PATCH /applications/:id/accept — fills the listing and rejects the other
 * active applications server-side, so it must be confirmed by the reader: it
 * is the one decision that changes lives beyond this row.
 */
export async function acceptReceivedApplication(
  id: string,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(`/applications/${id}/accept`, { method: "PATCH" }, transport);
}

/** PATCH /applications/:id/reject — optional reason shared with the applicant. */
export async function rejectReceivedApplication(
  id: string,
  reason: string | undefined,
  transport?: ApiTransport,
): Promise<void> {
  const trimmed = reason?.trim();
  await apiFetch(
    `/applications/${id}/reject`,
    {
      method: "PATCH",
      body: JSON.stringify(trimmed ? { rejectionReason: trimmed } : {}),
    },
    transport,
  );
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
 * the owner's pages for a matching id. The OpenAPI summary says « not found or
 * not open », and the backend does gate on `status` — but it relaxes that gate
 * for the owner, so such a fallback would never run and would only cost a full
 * collection read on the 404 path, the one request where a wrong answer matters
 * most.
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
 * The write behind both owner actions.
 *
 * It lets the `ApiError` through rather than catching it to build a sentence:
 * the typed error carries the status and the refusal code, and
 * `listingActionErrorMessage` below is what turns those into French — at the
 * point where the reader is shown one. Re-wrapping here would throw the type
 * away and leave the hook with `Error.message`, so a caller that does not format
 * it would display the raw `API 400 (…): Only a listing still in circulation can
 * be closed`.
 */
async function mutateListing(
  id: string,
  action: ListingActionKind,
  transport?: ApiTransport,
): Promise<void> {
  await apiFetch(
    `/replacement-listings/${id}/${action}`,
    { method: "PATCH" },
    transport,
  );
}
