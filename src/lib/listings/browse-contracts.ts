/**
 * Presentation contracts for the browse feed (`/listings`) — the replacement
 * doctor's side: every open posting the platform has, on a map and in a list.
 *
 * Kept apart from `./contracts`, which describes the practice's own listings.
 * The two surfaces read the same backend statuses but answer different
 * questions: `/listings/mine` asks "what happened to mine", this one asks "what
 * can I take". They have different filters, different summaries and different
 * audiences, and folding one into the other would give a single filter vocabulary
 * that fits neither.
 *
 * Components depend only on these types; `./browse-service` fetches and
 * `./browse-adapters` translates. The URL serialisation lives in `./browse-url`,
 * the horizon arithmetic in `./browse-horizon`, and the badge copy in
 * `./browse-badges`.
 */

import type { MapPlace, MapPlaceListing } from "@/lib/map/types";
import type { ReplacementListingStatus, Specialty } from "@/lib/types/api";

/** Where a listing sits, as the map needs it. */
export interface ListingLocation {
  latitude: number;
  longitude: number;
}

/** A posting in the public feed, ready to render. */
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
  /**
   * Null when the practice has never been geocoded.
   *
   * Not a rare case to be handled at the edges: the coordinates were nullable in
   * the database long before the feed could reach them, so every listing published
   * before its practice got an address sits here. The listing is still real and
   * still belongs in the list — it simply cannot take a pin.
   */
  location: ListingLocation | null;
  applicationsCount: number;
  /** Cap on simultaneous candidates; absent when the posting is uncapped. */
  maxApplications?: number;
  createdAt: string;
}

/**
 * One posting, with everything its public detail page shows.
 *
 * `BrowseListing` is the row: the feed slims `description` away and never
 * carries the backend status. The detail endpoint returns both, so this extends
 * the row with the two fields the page needs and nothing else.
 */
export interface BrowseListingDetail extends BrowseListing {
  status: ReplacementListingStatus;
}

/**
 * The posting the reader has chosen, as the rail's selection panel draws it.
 *
 * A shape both a row and a map preview satisfy. The map's preview carries no
 * specialty or urgency — the popup is about where a practice is, not what it
 * pays — so those two are optional rather than borrowed from the row at the
 * cost of a second request when the chosen posting is on another page.
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
 * The filters the feed endpoint accepts.
 *
 * Flat and optional rather than a discriminated union, because they combine: a
 * reader narrows to a city *and* a period *and* the urgent ones, and any shape
 * that only allowed one at a time would be a shape the toolbar cannot express.
 * `undefined` means "not narrowed" — never "match nothing", which is why the
 * service omits the key rather than sending an empty value.
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
  /** How the rows are ordered. */
  sort?: BrowseSort;
}

/** Filter + page + ordering, the three things that identify a view of the feed. */
export interface BrowseView extends BrowseFilters {
  page: number;
}

/**
 * How the reader wants the rows ordered.
 *
 * A view, not a filter: it changes no result set, only which row comes first.
 * That is why it sits with the contracts rather than beside the toolbar, and
 * why the server takes it — the endpoint owns the ordering.
 */
export type BrowseSort = "recent" | "urgent" | "startDate";

/**
 * How the two halves of the screen are arranged.
 *
 * A presentation choice, not a view of the feed: it changes no result set, only
 * how much of the screen the map and the list each take. `split` is the desktop
 * default — map above list, each about half the height; `list` gives the whole
 * height to the list for scanning many rows; `map` gives it to the map for
 * exploring. It lives here, beside the sort, because it is the same kind of
 * thing: a preference that does not narrow anything.
 *
 * It deliberately does *not* live in the URL, unlike the filters and the page.
 * On this screen a URL write re-renders the route and re-reads all three
 * endpoints, and a purely visual reflow is not worth a round trip. So it is
 * client state, like the map's fullscreen — reset on a reload, which is the
 * right life for a preference rather than for a search.
 */
export type BrowseLayout = "split" | "list" | "map";

/**
 * The map card's id, so a choice made in the list can bring it back into view.
 *
 * It lives here because two files need it and neither owns the other: the
 * toolbar card sets it on the element that wraps the map, and the container
 * looks it up to scroll it. Looked up by id rather than held in a ref because
 * the map is rendered through a `Suspense` boundary by a component this pair
 * does not own the markup of; the id is the one thing that crosses it.
 *
 * Declared once, here: a literal written in both places is two literals that
 * agree until a typo makes them disagree, and the failure is a camera move
 * nobody sees rather than an error.
 */
export const BROWSE_MAP_ID = "browse-map";

/**
 * The same filters as the form holds them.
 *
 * Distinct from `BrowseFilters` on purpose, and the difference is what a control
 * can express rather than what the endpoint accepts. An unfilled date field is
 * `""`, not an absent key: it is a value the input can hold and the reader can
 * clear, and folding it into `undefined` the moment it changes would make every
 * control's "no filter" state a special case instead of an ordinary value.
 *
 * `from` and `to` stay `YYYY-MM-DD` here — what a `<input type="date">` gives —
 * and are widened to ISO instants in `toBrowseView`, once, in a place that can
 * be tested.
 */
export interface BrowseFormFilters {
  specialty: Specialty | "";
  city: string;
  /** What the reader typed to search the postings' words. */
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
  /**
   * Share of the collection, 0–100, rounded.
   *
   * A share rather than an absolute target width: the panel draws the same
   * number of bars whatever the collection holds, and on a quiet week an
   * absolute scale would render every row as a hairline.
   */
  percent: number;
}

/** The counts the three summary panels are built from. */
export interface BrowseFacets {
  total: number;
  urgent: number;
  bySpecialty: SpecialtyFacet[];
}

/**
 * One place on the map, with the postings that sit on it.
 *
 * A place, not a posting: a practice publishes several openings and they all
 * carry its coordinates, so one pin per posting stacks identical buttons on the
 * same pixel — the top one takes every click and the rest cannot be reached.
 */
export type { MapPlace, MapPlaceListing };

/**
 * Everything the map needs, in one answer.
 *
 * No ordering of the collection, and no listing ids. The popup can name a
 * posting the list is not showing — the places are ordered by population and each
 * holds four previews of its own — and turning the list to it is now a question
 * asked when the reader asks it (`fetchListingPageOf`). It used to travel here,
 * as the id of every matching posting: a rare click paid for on every page
 * render, on every filter change, and on every reordering.
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
 * One page of the feed — the rows, and the facts about the page they came from.
 *
 * No `facets`, and that is not an omission. The panels the facets feed answer
 * (repartition par spécialité, urgentes) depend on a strict subset of the
 * filters, and the feed depends on all of them plus the page; carrying the
 * panels inside the page's answer meant every page turn and every reordering
 * re-asked for them. Two reads with two lifetimes, kept apart: this one for the
 * rows, `fetchFacets` for the panels.
 */
export interface BrowseListingsData {
  listings: BrowseListing[];
  page: number;
  totalPages: number;
  /** Filtered total, driving pagination. */
  total: number;
}

/**
 * How soon a posting has to start — the question the segmented row above the
 * results answers, in one tap.
 *
 * A horizon and the bounds it produces are the same filter expressed two ways:
 * the row is the quick way in, the two date fields are the exact one, and both
 * write the same `from` **and `to`**. A horizon names a *period*, not a lower
 * bound — the lone `from` this used to write was how « Ce mois » read as « from
 * the 1st of the month after next's-before » and silently dropped every posting
 * starting this month, which is the one month the chip is named for.
 */
export type BrowseHorizon = "ALL" | "WEEK" | "MONTH" | "LATER";

/** The date-range fields a horizon narrows, exactly as the form holds them. */
export interface HorizonBounds {
  /** Inclusive first day (`YYYY-MM-DD`), or `""` for unbounded. */
  from: string;
  /** Inclusive last day (`YYYY-MM-DD`), or `""` for unbounded. */
  to: string;
}
