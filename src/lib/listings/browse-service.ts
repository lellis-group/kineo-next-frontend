/**
 * Browse service — the replacement doctor's side: the open postings the platform
 * has, and the counts the summary panels are drawn from.
 *
 * Two endpoints are read per view rather than one. `GET /replacement-listings`
 * returns the rows and `GET /replacement-listings/facets` returns the totals,
 * and they are asked separately on purpose: the panels must keep showing the
 * whole collection's shape while a filter is narrowing the rows underneath them,
 * which is the one thing a `meta.total` taken from the filtered page can never
 * do. Asking for the facets with the same filters keeps the two answers
 * describing the same collection.
 *
 * Both go through the same injected `ApiTransport` as the rest of the domain
 * services, so the server render and the client refetch run the same code.
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
  adaptBrowseListings,
  adaptBrowsePlaces,
  adaptFacets,
} from "./browse-adapters";
import type {
  BrowseFacets,
  BrowseFilters,
  BrowseListingsData,
  BrowsePlacesData,
} from "./browse-contracts";

/**
 * Rows per page, server render and client refetch alike.
 *
 * One number for the same reason as `MY_LISTINGS_PAGE_SIZE`: the page the server
 * rendered and the page the client refetches have to agree, or a filter change
 * silently changes the page size and the reader lands on a page that does not
 * exist. Capped at 100, which is the endpoint's own ceiling.
 *
 * Ten, and not the endpoint's default of twenty: this is a list under a map, and
 * twenty rows measured 1320px of table — a page of 2851px, over three screens,
 * with the map already scrolled past before the second one. Ten keeps the whole
 * collection's worth of scanning within reach and matches what every other list
 * screen in the product uses.
 */
export const BROWSE_PAGE_SIZE = 10;

/**
 * GET /replacement-listings — the open postings matching a filter.
 *
 * Rows and nothing else. The panels' counts are a second read, asked for by
 * whoever owns them, because they depend on a subset of the filters the page
 * does (never `specialty`, never `sort`, never the page) and were being asked
 * again on every page turn and every reordering while unchanged — three
 * requests behind a click that moved ten rows. See `fetchFacets`.
 *
 * `city` is matched by the backend on the practice's city, and the date bounds
 * are inclusive lower/upper bounds on `startDate`. Omitted entirely when unset:
 * an empty string would be a search for a city literally called "", not the
 * absence of a filter.
 *
 * A feed nobody can read is an empty feed, not a failure — same reasoning as
 * `fetchMyListings`, and the same `notFoundAs(null)`.
 *
 * `init` is the caller's `RequestInit`, which is what lets a superseded read be
 * aborted instead of left to finish in the background.
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

/**
 * GET /replacement-listings/places — the places the map is drawn from.
 *
 * Separate from `fetchBrowseListings` because the map is not a page: that one
 * is coupled to the pager and refetches whenever the reader pages, which is
 * exactly what a map must not do. Same filters, no page.
 *
 * Places rather than postings, and that is the point. The map draws a pin per
 * practice; reading postings and grouping them client-side drew N pins out of a
 * hundred postings, and past that the rest of the collection left the map
 * silently — with no "page 5 of 40" to say so, because a map has no pages.
 *
 * `null` on failure, never an empty set. A reader who filters down to nothing is
 * a result; a reader whose refresh failed is not, and handing back `[]` for both
 * meant a failed refresh wiped the map and said nothing. The caller keeps the
 * pins it has, which is the smaller lie.
 */
export async function fetchBrowsePlaces(
  filters: BrowseFilters = {},
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<BrowsePlacesData | null> {
  const query = buildQuery({
    specialty: filters.specialty,
    city: filters.city,
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
 * GET /replacement-listings/page-of — which page holds one posting.
 *
 * Asked when the reader picks a posting from a map popup and the list is not
 * already showing it, which is the only moment a position is worth anything. It
 * used to be delivered with every map read, as the id of every matching posting,
 * so that a rare click could do an `indexOf` over a list the reader had been
 * paying for since the page loaded.
 *
 * Sent the reader's filters, because a page is a position *within the filtered
 * collection*: a posting the current view does not show has no page in it, and
 * the answer is `null` rather than a page it is not on. Sent `limit` for the same
 * reason — a page number means nothing without the size it was counted against.
 *
 * `null` on failure as well, for the same effect: turning the list to a wrong
 * page is worse than not turning it.
 */
export async function fetchListingPageOf(
  id: string,
  filters: BrowseFilters & { limit?: number } = {},
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<number | null> {
  const query = buildQuery({
    id,
    specialty: filters.specialty,
    city: filters.city,
    startDateFrom: filters.startDateFrom,
    startDateTo: filters.startDateTo,
    urgent: filters.urgentOnly ? "true" : undefined,
    sort: filters.sort,
    limit: filters.limit ?? BROWSE_PAGE_SIZE,
  });

  const raw = await apiFetch<ApiListingPageOf>(
    `/replacement-listings/page-of?${query}`,
    init,
    transport,
  ).catch(() => null);

  return raw?.page ?? null;
}

/**
 * GET /replacement-listings/facets — totals over the whole matching collection.
 *
 * Sent the reader's filters but never their specialty: a « répartition par
 * spécialité » panel is meant to show what else is on offer, and a panel reading
 * « Médecine générale — 12 » under a Dermatologie filter answers a question
 * nobody asked. The page and the ordering are not sent either, and for the same
 * reason: the panels do not depend on either, so asking again when either changes
 * is a request that can only answer what it answered last time.
 *
 * Never throws. The panels are supporting information, and the cost of losing
 * them should be three empty rows rather than an error page.
 */
export async function fetchFacets(
  filters: BrowseFilters = {},
  transport?: ApiTransport,
  init?: RequestInit,
): Promise<BrowseFacets> {
  const query = buildQuery({
    city: filters.city,
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
      // Only the failures the panels can honestly absorb are absorbed. A dropped
      // connection or a 5xx is the feed itself being unreachable, and three
      // empty panels say « nobody published anything » when the truth is « we
      // could not ask » — a lie the reader cannot detect. A 4xx, on the other
      // hand, means the filters this reader is holding are ones the endpoint
      // rejects; the rows query fails the same way and takes the screen with it,
      // which is the correct outcome: the filters are the cause.
      if (error instanceof ApiError && error.status < 500) {
        throw error;
      }
      return adaptFacets(undefined);
    });
}
