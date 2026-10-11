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
  ApiPaginated,
  ApiReplacementListing,
} from "../types/api";
import { adaptBrowseListings, adaptFacets } from "./browse-adapters";
import type {
  BrowseFacets,
  BrowseFilters,
  BrowseListing,
  BrowseListingsData,
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
 * `city` is matched by the backend on the practice's city, and the date bounds
 * are inclusive lower/upper bounds on `startDate`. Omitted entirely when unset:
 * an empty string would be a search for a city literally called "", not the
 * absence of a filter.
 *
 * A feed nobody can read is an empty feed, not a failure — same reasoning as
 * `fetchMyListings`, and the same `notFoundAs(null)`.
 */
export async function fetchBrowseListings(
  filters: BrowseFilters & { page?: number; limit?: number } = {},
  transport?: ApiTransport,
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

  const [raw, facets] = await Promise.all([
    apiFetch<ApiPaginated<ApiReplacementListing>>(
      `/replacement-listings?${query}`,
      undefined,
      transport,
    ).catch(notFoundAs(null)),
    fetchFacets(filters, transport),
  ]);

  return {
    listings: adaptBrowseListings(raw?.data ?? []),
    page: raw?.meta.page ?? page,
    totalPages: raw?.meta.totalPages ?? 0,
    total: raw?.meta.total ?? 0,
    // The panels fall back to zeros rather than disappearing when the facets read
    // fails: a reader who loses a summary can still use the list, whereas a
    // thrown error would take the whole page down over a panel.
    facets,
  };
}

/**
 * How many postings the map is drawn from, whatever page is on screen.
 *
 * The endpoint's own ceiling. A map is not a list: it is the whole filtered
 * collection seen from above, and tying it to `BROWSE_PAGE_SIZE` meant it redrew
 * itself on every page change — a reader paging through results watched the same
 * posts appear and vanish from the map, which is the one thing a map is not
 * supposed to do.
 *
 * A hundred is also where this stops being honest: past it, what the map shows
 * and what the reader was offered have little to do with each other, and that gap
 * has to be stated rather than hidden.
 */
export const BROWSE_MAP_LIMIT = 100;

/**
 * The postings the map draws, for a set of filters and no page in particular.
 *
 * Separate from `fetchBrowseListings` on purpose. That one is coupled to the page —
 * the hook refetches it when the reader pages — which is exactly what a map must
 * not be. Same endpoint, same filters, first hundred rows: the difference is in
 * what it ignores.
 *
 * Returning full postings rather than bare coordinates is what keeps the popups
 * worth opening. A cheaper endpoint carrying only practice positions would have
 * left the marker with a count and a city, and nothing to say about the posts
 * behind it.
 */
export async function fetchBrowseLocations(
  filters: BrowseFilters = {},
  transport?: ApiTransport,
): Promise<BrowseListing[]> {
  const query = buildQuery({
    specialty: filters.specialty,
    city: filters.city,
    startDateFrom: filters.startDateFrom,
    startDateTo: filters.startDateTo,
    urgent: filters.urgentOnly ? "true" : undefined,
    page: 1,
    limit: BROWSE_MAP_LIMIT,
  });

  const raw = await apiFetch<ApiPaginated<ApiReplacementListing>>(
    `/replacement-listings?${query}`,
    undefined,
    transport,
  ).catch(notFoundAs(null));

  return adaptBrowseListings(raw?.data ?? []);
}

/**
 * GET /replacement-listings/facets — totals over the whole matching collection.
 *
 * Sent the reader's filters but never their specialty: a « répartition par
 * spécialité » panel is meant to show what else is on offer, and a panel reading
 * « Médecine générale — 12 » under a Dermatologie filter answers a question
 * nobody asked.
 *
 * Never throws. The panels are supporting information, and the cost of losing
 * them should be three empty rows rather than an error page.
 */
export async function fetchFacets(
  filters: BrowseFilters = {},
  transport?: ApiTransport,
): Promise<BrowseFacets> {
  const query = buildQuery({
    city: filters.city,
    startDateFrom: filters.startDateFrom,
    startDateTo: filters.startDateTo,
    urgent: filters.urgentOnly ? "true" : undefined,
  });

  return apiFetch<ApiListingFacets>(
    `/replacement-listings/facets${query ? `?${query}` : ""}`,
    undefined,
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
