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
 * `./browse-adapters` translates.
 */

import { toIsoDayBound } from "@/lib/format";
import type { MapPlace, MapPlaceListing } from "@/lib/map/types";
import { SPECIALTY_LABELS } from "@/lib/profile";
import type { Specialty } from "@/lib/types/api";
import type { BadgeTone } from "@/lib/ui-tokens";

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

/**
 * The form's filters as a view of the feed.
 *
 * The one place the widening happens. Every empty value becomes `undefined`
 * rather than an empty string, because the endpoint reads `city=""` as a search
 * for a city literally called nothing and rejects it.
 *
 * The upper bound lands on the last millisecond of its day: `YYYY-MM-DD` is a
 * calendar date with no time, and stopping at midnight would silently drop every
 * posting published on the day the reader picked.
 */
/** The view the server renders on arrival: no filter, first page, newest first. */
export const DEFAULT_BROWSE_VIEW = { page: 1, sort: "recent" } as const;

export function toBrowseView(
  filters: BrowseFormFilters,
  page = 1,
  sort: BrowseSort = DEFAULT_BROWSE_VIEW.sort,
): BrowseView {
  return {
    page,
    sort,
    specialty: filters.specialty || undefined,
    city: filters.city.trim() || undefined,
    q: filters.q.trim() || undefined,
    urgentOnly: filters.urgentOnly || undefined,
    startDateFrom: toIsoDayBound(filters.from),
    startDateTo: toIsoDayBound(filters.to, true),
  };
}

/** True when a view is the one the server already answered for. */
export function isDefaultBrowseView(view: BrowseView): boolean {
  return (
    view.page === DEFAULT_BROWSE_VIEW.page &&
    view.sort === DEFAULT_BROWSE_VIEW.sort &&
    view.specialty === undefined &&
    view.city === undefined &&
    view.q === undefined &&
    view.startDateFrom === undefined &&
    view.startDateTo === undefined &&
    view.urgentOnly !== true
  );
}

/** The only sort values the URL is allowed to carry; anything else falls back. */
const BROWSE_SORT_IDS: readonly BrowseSort[] = [
  "recent",
  "urgent",
  "startDate",
];

/** The one date shape the two `<input type="date">` fields produce and read. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function readSpecialty(raw: string): Specialty | "" {
  // A has-own check, not `in`: the value comes off the query string, so it must
  // be a real specialty rather than a key that happens to sit on the prototype.
  return Object.hasOwn(SPECIALTY_LABELS, raw) ? (raw as Specialty) : "";
}

function readDate(raw: string): string {
  if (!ISO_DAY.test(raw)) return "";
  // The shape alone is not enough — `Date.parse("2026-02-30")` does not fail, it
  // rolls over to March 2nd. So the day is re-read back and compared: a real day
  // survives the round-trip, a rolled-over one does not. Handing the feed an
  // impossible bound reads as a request that matched nothing.
  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  return isReal ? raw : "";
}

/**
 * The feed's view as it round-trips through the URL.
 *
 * The two halves of the same boundary: a filtered search has to be shareable
 * (write) and restorable from a link or the back button (read). They live here,
 * beside the `toBrowseView` they mirror, because the URL is a second
 * serialisation of the same view — and a value that survives a round-trip
 * unchanged is what makes the two agree. They are separate functions rather
 * than one because they are crossed in opposite directions and folding them
 * would hide that a round-trip must be exact.
 *
 * The reader accepts a `URLSearchParams`-shaped source (`get`) so both ends pass
 * the same value unchanged: the server's `searchParams` wrapped once, and the
 * client's `useSearchParams()` as-is.
 */
export function browseViewFromParams(params: Pick<URLSearchParams, "get">): {
  filters: BrowseFormFilters;
  page: number;
  sort: BrowseSort;
} {
  return {
    filters: {
      specialty: readSpecialty(params.get("specialty") ?? ""),
      city: (params.get("city") ?? "").trim(),
      q: (params.get("q") ?? "").trim(),
      from: readDate(params.get("from") ?? ""),
      to: readDate(params.get("to") ?? ""),
      urgentOnly: params.get("urgent") === "true",
    },
    page: (() => {
      const page = Number(params.get("page") ?? "");
      return Number.isInteger(page) && page >= 1
        ? page
        : DEFAULT_BROWSE_VIEW.page;
    })(),
    sort: (BROWSE_SORT_IDS as readonly string[]).includes(
      params.get("sort") ?? "",
    )
      ? (params.get("sort") as BrowseSort)
      : DEFAULT_BROWSE_VIEW.sort,
  };
}

/**
 * Writes a view back to a query string, omitting every default.
 *
 * The omissions are the point: a default view serialises to an empty string, so
 * `/listings` and not `/listings?page=1&sort=recent`. The two halves round-trip
 * against `browseViewFromParams`, and a value that reads back as the same view
 * it was written from is the only guarantee that the URL and the screen never
 * drift.
 */
export function browseViewToParams(
  filters: BrowseFormFilters,
  page: number,
  sort: BrowseSort,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.specialty) params.set("specialty", filters.specialty);
  const city = filters.city.trim();
  if (city) params.set("city", city);
  const q = filters.q.trim();
  if (q) params.set("q", q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.urgentOnly) params.set("urgent", "true");
  if (sort !== DEFAULT_BROWSE_VIEW.sort) params.set("sort", sort);
  if (page !== DEFAULT_BROWSE_VIEW.page) params.set("page", String(page));

  return params;
}

/**
 * The page to land on when the requested one is past the end, or `null`.
 *
 * The URL accepts any positive integer, and a shared or hand-edited link that
 * names `page=5` under a two-page collection asks a question the read can only
 * answer honestly by turning it down: empty rows under a pager claiming
 * « Page 5 sur 2 ». The caller redirects to the answer this returns — the last
 * page that exists — so the URL names the view the reader is actually looking
 * at. A `totalPages` of 0 means the collection itself is empty: nothing to
 * clamp, and the empty state answers an empty collection better than a redirect
 * to nowhere.
 */
export function browsePageClamp(
  page: number,
  totalPages: number,
): number | null {
  if (totalPages > 0 && page > totalPages) {
    return totalPages;
  }
  return null;
}

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

/**
 * The bounds a horizon produces, on a caller-supplied clock.
 *
 * `now` is a parameter rather than a `new Date()` done inside so the three
 * boundary days — week's Monday, month's first and last, next month's start —
 * can be tested against a fixed day. `horizonBounds` is the reader-facing
 * wrapper that hands over the real clock.
 *
 * The bounds are *calendar*-anchored, not today-anchored. « Cette semaine »
 * spans Monday to Sunday, « Ce mois » the 1st to the month's last day, and the
 * chips re-read the date fields against the current clock: bounds tied to
 * today's date would unlight every chip at midnight under a shared link — a
 * narrowing the results still carry, announced by a row that says nothing. A
 * calendar week and month keep each chip lit for exactly the span its labels
 * name. (Postings the feed shows are open ones, so a replacement that started
 * earlier in the week but is still running belongs under « Cette semaine »
 * every bit as much as one starting tomorrow.)
 */
export function horizonBoundsFor(
  horizon: BrowseHorizon,
  now: Date,
): HorizonBounds {
  switch (horizon) {
    case "WEEK":
      // Monday through Sunday of the current week. « From today » was the
      // original reading and it had to unlight again every midnight; the exact
      // "from now on" tool is the date field beside the chips, not the chip.
      return {
        from: toIsoDate(
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - ((now.getDay() + 6) % 7),
          ),
        ),
        to: toIsoDate(
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + (6 - ((now.getDay() + 6) % 7)),
          ),
        ),
      };
    case "MONTH":
      // The 1st through the last day of the month — the month the chip is
      // named for, not the month that follows the one it used to skip over.
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "LATER":
      // The first of the month after this one, with no upper bound: everything
      // that falls past the other two chips.
      return {
        from: toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
        to: "",
      };
    default:
      return { from: "", to: "" };
  }
}

/** The bounds a horizon produces, on today's clock. */
export function horizonBounds(horizon: BrowseHorizon): HorizonBounds {
  return horizonBoundsFor(horizon, new Date());
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * The horizon a pair of date fields corresponds to, or `ALL`.
 *
 * Used to keep the segmented row honest about the date fields: typing a range
 * that no longer matches any option has to clear the selection, otherwise the row
 * would claim a narrowing the results do not have.
 *
 * Each horizon is matched against the exact pair it produces, rather than
 * against a range. Reading « at or before today » as « Cette semaine » looked
 * equivalent and is not: a reader who typed a date last month would have seen
 * the chip for a filter starting today lit under a date a month in the past. The
 * chip has to name what is actually applied.
 *
 * The chips overlap — an open replacement that started mid-week is both
 * « Cette semaine » and « Ce mois » — but their *pairs* never collide: a month
 * is longer than a week, so the two chips' bounds cannot coincide on any day.
 * Deterministic on both ends: which pair is applied and which chip it lights
 * rest on the same strings.
 */
export function horizonForBounds(
  from?: string,
  to?: string,
  now: Date = new Date(),
): BrowseHorizon {
  if (!from) {
    return "ALL";
  }
  for (const horizon of ["WEEK", "MONTH", "LATER"] as const) {
    const bounds = horizonBoundsFor(horizon, now);
    if (bounds.from === from && bounds.to === to) {
      return horizon;
    }
  }
  return "ALL";
}

/** Tone used on the « Urgent » badge of a listing in the feed. */
const URGENT_TONE = "danger";
const OPEN_TONE = "info";

/**
 * How a posting is badged, in one place.
 *
 * The table and the mobile card both decide between « Urgent » and « Ouverte »,
 * and they used to do it by writing the label and the tone out twice — which is
 * how a card ends up reading « Urgent » in red on phones and « Urgent » in
 * something else on a desktop. One decision, two renderings.
 */
export function listingBadge(listing: { urgent: boolean }): {
  label: string;
  tone: BadgeTone;
} {
  return listing.urgent
    ? { label: "Urgent", tone: URGENT_TONE }
    : { label: "Ouverte", tone: OPEN_TONE };
}
