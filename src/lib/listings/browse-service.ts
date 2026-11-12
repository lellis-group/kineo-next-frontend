/**
 * Browse service — the replacement doctor's side: the open postings, the map's
 * places, and the counts the summary panels are drawn from. Rows and facets are
 * separate reads because they depend on different subsets of the view.
 */

import {
  ApiError,
  type ApiTransport,
  apiFetch,
  buildQuery,
  notFoundAs,
} from "../api-client";
import type {
  ApiListingFacets,
  ApiListingPageOf,
  ApiListingPlaces,
  ApiPaginated,
  ApiReplacementListing,
} from "../types/api";
import {
  adaptBrowseListingDetail,
  adaptBrowseListings,
  adaptBrowsePlaces,
  adaptFacets,
} from "./browse-adapters";
import type {
  BrowseFacets,
  BrowseFilters,
  BrowseListingDetail,
  BrowseListingsData,
  BrowsePlacesData,
} from "./browse-contracts";

/**
 * Rows per page, server render and client refetch alike — they must agree, or
 * a filter change lands the reader on a page that does not exist.
 */
export const BROWSE_PAGE_SIZE = 10;

/**
 * GET /replacement-listings — the open postings matching a filter. Unset
 * filters are omitted: an empty string would search for a city called "".
 */
export async function fetchBrowseListings(
  filters: BrowseFilters & { page?: number; limit?: number } = {},
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<BrowseListingsData> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? BROWSE_PAGE_SIZE;

  const query = buildQuery({
    specialty: filters.specialty,
    city: filters.city,
    q: filters.q,
    startDateFrom: filters.startDateFrom,
    startDateTo: filters.startDateTo,
    urgent: filters.urgentOnly ? "true" : undefined,
    sort: filters.sort,
    page,
    limit,
  });

  const raw = await apiFetch<ApiPaginated<ApiReplacementListing>>(
    `/replacement-listings?${query}`,
    init,
    transport,
  ).catch(notFoundAs(null));

  return {
    listings: adaptBrowseListings(raw?.data ?? []),
    page: raw?.meta.page ?? page,
    totalPages: raw?.meta.totalPages ?? 0,
    total: raw?.meta.total ?? 0,
  };
}

/** GET /replacement-listings/:id — one posting, for its public detail page. */
export async function fetchBrowseListing(
  id: string,
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<BrowseListingDetail> {
  const raw = await apiFetch<ApiReplacementListing>(
    `/replacement-listings/${encodeURIComponent(id)}`,
    init,
    transport,
  );

  return adaptBrowseListingDetail(raw);
}

/**
 * GET /replacement-listings/places — one entry per practice, unpaginated.
 *
 * `null` on failure, never an empty set: the caller keeps the pins it has
 * rather than showing a failed refresh as "no results".
 */
export async function fetchBrowsePlaces(
  filters: BrowseFilters = {},
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<BrowsePlacesData | null> {
  const query = buildQuery({
    specialty: filters.specialty,
    city: filters.city,
    q: filters.q,
    startDateFrom: filters.startDateFrom,
    startDateTo: filters.startDateTo,
    urgent: filters.urgentOnly ? "true" : undefined,
    sort: filters.sort,
  });

  try {
    const raw = await apiFetch<ApiListingPlaces>(
      `/replacement-listings/places${query ? `?${query}` : ""}`,
      init,
      transport,
    );
    return adaptBrowsePlaces(raw);
  } catch {
    return null;
  }
}

/**
 * Three outcomes: "not in this view" and "could not ask" must not both read as
 * « Annonce introuvable ».
 */
export type ListingPageOfResult =
  | { status: "found"; page: number }
  | { status: "missing" }
  | { status: "unavailable" };

/**
 * GET /replacement-listings/page-of — which page of the filtered, sorted
 * collection holds one posting. Asked on demand when a map pick targets a row
 * the list is not showing. Never throws.
 */
export async function fetchListingPageOf(
  id: string,
  filters: BrowseFilters & { limit?: number } = {},
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<ListingPageOfResult> {
  const query = buildQuery({
    id,
    specialty: filters.specialty,
    city: filters.city,
    q: filters.q,
    startDateFrom: filters.startDateFrom,
    startDateTo: filters.startDateTo,
    urgent: filters.urgentOnly ? "true" : undefined,
    sort: filters.sort,
    limit: filters.limit ?? BROWSE_PAGE_SIZE,
  });

  try {
    const raw = await apiFetch<ApiListingPageOf>(
      `/replacement-listings/page-of?${query}`,
      init,
      transport,
    );
    return raw.page === null
      ? { status: "missing" }
      : { status: "found", page: raw.page };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * GET /replacement-listings/facets — totals over the whole matching collection.
 * Never sent the specialty (the panel shows what else is on offer), the page
 * or the sort.
 */
export async function fetchFacets(
  filters: BrowseFilters = {},
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<BrowseFacets> {
  const query = buildQuery({
    city: filters.city,
    q: filters.q,
    startDateFrom: filters.startDateFrom,
    startDateTo: filters.startDateTo,
    urgent: filters.urgentOnly ? "true" : undefined,
  });

  return apiFetch<ApiListingFacets>(
    `/replacement-listings/facets${query ? `?${query}` : ""}`,
    init,
    transport,
  )
    .then(adaptFacets)
    .catch((error: unknown) => {
      // A 4xx means the filters are rejected: the rows query fails too, and
      // should. Network errors and 5xx leave the panels empty instead.
      if (error instanceof ApiError && error.status < 500) {
        throw error;
      }
      return adaptFacets(undefined);
    });
}
