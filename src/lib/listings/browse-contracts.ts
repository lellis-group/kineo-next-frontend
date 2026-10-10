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
  /** ISO date, inclusive lower bound on `startDate`. */
  startDateFrom?: string;
  /** ISO date, inclusive upper bound on `startDate`. */
  startDateTo?: string;
  urgentOnly?: boolean;
}

/** Filter + page, the two things that identify a view of the feed. */
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
export interface BrowseFormFilters {
  specialty: Specialty | "";
  city: string;
  from: string;
  to: string;
  urgentOnly: boolean;
}

export const EMPTY_BROWSE_FILTERS: BrowseFormFilters = {
  specialty: "",
  city: "",
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
export function toBrowseView(filters: BrowseFormFilters, page = 1): BrowseView {
  return {
    page,
    specialty: filters.specialty || undefined,
    city: filters.city.trim() || undefined,
    urgentOnly: filters.urgentOnly || undefined,
    startDateFrom: toIsoDayBound(filters.from),
    startDateTo: toIsoDayBound(filters.to, true),
  };
}

/** The view the server renders on arrival: no filter, first page. */
export const DEFAULT_BROWSE_VIEW: BrowseView = { page: 1 };

/** True when a view is the one the server already answered for. */
export function isDefaultBrowseView(view: BrowseView): boolean {
  return (
    view.page === DEFAULT_BROWSE_VIEW.page &&
    view.specialty === undefined &&
    view.city === undefined &&
    view.startDateFrom === undefined &&
    view.startDateTo === undefined &&
    view.urgentOnly !== true
  );
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
export interface MapPlace {
  /** Stable key for the coordinates this place was grouped under. */
  key: string;
  latitude: number;
  longitude: number;
  listings: BrowseListing[];
}

/** One feed page, plus the counts behind the panels. */
export interface BrowseListingsData {
  listings: BrowseListing[];
  page: number;
  totalPages: number;
  /** Filtered total, driving pagination. */
  total: number;
  facets: BrowseFacets;
}

/**
 * How soon a posting has to start — the question the segmented row above the
 * results answers, in one tap.
 *
 * A horizon and the date range it produces are the same filter expressed two
 * ways: the row is the quick way in, the two date fields are the exact one, and
 * both write the same `startDateFrom`. That is why this is a function rather than
 * four independent filter flags — a reader who picks « Ce mois » and then widens
 * the date field must not end up with two narrowings fighting each other.
 */
export type BrowseHorizon = "ALL" | "WEEK" | "MONTH" | "LATER";

export interface BrowseHorizonOption {
  id: BrowseHorizon;
  label: string;
}

export const BROWSE_HORIZONS: readonly BrowseHorizonOption[] = [
  { id: "ALL", label: "Toutes" },
  { id: "WEEK", label: "Cette semaine" },
  { id: "MONTH", label: "Ce mois" },
  { id: "LATER", label: "Plus tard" },
] as const;

/** ISO date (no time) the horizon narrows `startDateFrom` to. */
export function horizonStart(horizon: BrowseHorizon): string | undefined {
  const now = new Date();
  let monthOffset: number;

  switch (horizon) {
    case "WEEK":
      // Today, not Monday: the reader is asking what they could take from now
      // on, and a posting starting tomorrow is in this week's terms even though
      // tomorrow is Sunday.
      return toIsoDate(now);
    case "MONTH":
      monthOffset = 1;
      break;
    case "LATER":
      monthOffset = 2;
      break;
    default:
      return undefined;
  }

  return toIsoDate(
    new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
  );
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * The horizon a given lower bound corresponds to, or `ALL`.
 *
 * Used to keep the segmented row honest about the date fields: typing a range
 * that no longer matches any option has to clear the selection, otherwise the row
 * would claim a narrowing the results do not have.
 *
 * Each horizon is matched against the exact bound it produces, rather than
 * against a range. Reading « at or before today » as « Cette semaine » looked
 * equivalent and is not: a reader who typed a date last month would have seen
 * the chip for a filter starting today lit under a date a month in the past. The
 * chip has to name what is actually applied.
 */
export function horizonForStart(start?: string): BrowseHorizon {
  if (!start) {
    return "ALL";
  }
  for (const horizon of ["WEEK", "MONTH", "LATER"] as const) {
    if (start === horizonStart(horizon)) {
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
