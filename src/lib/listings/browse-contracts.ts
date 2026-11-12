/**
 * Presentation contracts for the browse feed (`/listings`) — the replacement
 * doctor's side: every open posting the platform has, on a map and in a list.
 * Kept apart from `./contracts`, which describes the practice's own listings:
 * same statuses, different filters and audiences.
 */

import type { MapPlace, MapPlaceListing, MapPoint } from "@/lib/map/types";
import type { ReplacementListingStatus, Specialty } from "@/lib/types/api";

export interface ListingLocation {
  latitude: number;
  longitude: number;
}

export interface BrowseListing {
  id: string;
  title: string;
  /** « Du 15 sept. au 30 sept. 2026 ». */
  dateRange: string;
  /** ISO bounds, kept apart from `dateRange` for the sort and the map. */
  startDate: string;
  endDate: string;
  specialty: Specialty;
  urgent: boolean;
  description?: string;
  practiceName: string;
  city: string;
  /** Null when the practice has never been geocoded — common, not an edge case. */
  location: ListingLocation | null;
  applicationsCount: number;
  /** Cap on simultaneous candidates; absent when the posting is uncapped. */
  maxApplications?: number;
  createdAt: string;
}

/** The feed row plus the backend status, which only the detail endpoint sends. */
export interface BrowseListingDetail extends BrowseListing {
  status: ReplacementListingStatus;
}

/**
 * The posting the reader has chosen. A shape both a row and a map preview
 * satisfy — the preview carries no specialty or urgency, hence optional.
 */
export interface BrowseSelection {
  id: string;
  title: string;
  dateRange: string;
  practiceName: string;
  city: string;
  specialty?: Specialty;
  urgent?: boolean;
  /** Where the posting sits, when it is known — the way back to its pin. */
  location?: ListingLocation | null;
}

/**
 * The filters the feed endpoint accepts. `undefined` means "not narrowed" —
 * never "match nothing", so the service omits the key.
 */
export interface BrowseFilters {
  specialty?: Specialty;
  city?: string;
  /** Free-text match on the posting's title and description. */
  q?: string;
  /** ISO date, inclusive lower bound on `startDate`. */
  startDateFrom?: string;
  /** ISO date, inclusive upper bound on `startDate`. */
  startDateTo?: string;
  urgentOnly?: boolean;
  sort?: BrowseSort;
}

export interface BrowseView extends BrowseFilters {
  page: number;
}

export type BrowseSort = "recent" | "urgent" | "startDate";

/**
 * How the map and the list share the screen. Client state rather than URL: a
 * URL write re-reads all three endpoints, not worth it for a visual reflow.
 */
export type BrowseLayout = "split" | "list" | "map";

/**
 * The map card's id, so a choice made in the list can scroll it back into view.
 * An id rather than a ref because the map sits behind a `Suspense` boundary.
 */
export const BROWSE_MAP_ID = "browse-map";

/**
 * The same filters as the form holds them: an unfilled field is `""`, and
 * `from`/`to` stay `YYYY-MM-DD` until `toBrowseView` widens them.
 */
export interface BrowseFormFilters {
  specialty: Specialty | "";
  city: string;
  q: string;
  from: string;
  to: string;
  urgentOnly: boolean;
}

export const EMPTY_BROWSE_FILTERS: BrowseFormFilters = {
  specialty: "",
  city: "",
  q: "",
  from: "",
  to: "",
  urgentOnly: false,
};

/** One row of the « répartition par spécialité » panel. */
export interface SpecialtyFacet {
  specialty: Specialty;
  label: string;
  count: number;
  /** Share of the collection, 0–100, rounded. */
  percent: number;
}

/** How many of the matching postings start in one week. */
export interface StartWeekFacet {
  /** ISO instant of the Monday (00:00 UTC) opening the week. */
  weekStart: string;
  count: number;
}

export interface BrowseFacets {
  total: number;
  urgent: number;
  bySpecialty: SpecialtyFacet[];
  /**
   * Starts per week over the next twelve, current week first. Empty means « no
   * data », never twelve zero weeks.
   */
  byStartWeek: StartWeekFacet[];
}

export type { MapPlace, MapPlaceListing, MapPoint };

/**
 * Everything the map needs, in one answer. No listing ids: finding a posting's
 * page in the list is asked on demand (`fetchListingPageOf`).
 */
export interface BrowsePlacesData {
  places: MapPlace[];
  /** Matching postings whose practice was never geocoded. */
  unlocated: number;
  /** How many practices the filters matched, before the ceiling. */
  totalPlaces: number;
  /** True when practices were cut at the ceiling. */
  truncated: boolean;
}

/**
 * One page of the feed. No facets: they don't depend on the page or the sort,
 * so `fetchFacets` reads them separately.
 */
export interface BrowseListingsData {
  listings: BrowseListing[];
  page: number;
  totalPages: number;
  /** Filtered total, driving pagination. */
  total: number;
}

/**
 * How soon a posting has to start. A horizon names a *period*: it writes both
 * `from` and `to`, the same fields the date inputs hold.
 */
export type BrowseHorizon = "ALL" | "WEEK" | "MONTH" | "LATER";

/** The date-range fields a horizon narrows, exactly as the form holds them. */
export interface HorizonBounds {
  /** Inclusive first day (`YYYY-MM-DD`), or `""` for unbounded. */
  from: string;
  /** Inclusive last day (`YYYY-MM-DD`), or `""` for unbounded. */
  to: string;
}
