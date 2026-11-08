/**
 * The browse feed's view as it round-trips through the URL.
 *
 * The two halves of the same boundary: a filtered search has to be shareable
 * (write) and restorable from a link or the back button (read). They live
 * together, beside the `toBrowseView` they mirror, because the URL is a second
 * serialisation of the same view — and a value that survives a round-trip
 * unchanged is what makes the two agree.
 *
 * The reader accepts a `URLSearchParams`-shaped source (`get`) so both ends pass
 * the same value unchanged: the server's `searchParams` wrapped once, and the
 * client's `useSearchParams()` as-is.
 */

import { toIsoDayBound } from "@/lib/format";
import { SPECIALTY_LABELS } from "@/lib/profile";
import type { Specialty } from "@/lib/types/api";
import type {
  BrowseFormFilters,
  BrowseSort,
  BrowseView,
} from "./browse-contracts";

/** The view the server renders on arrival: no filter, first page, newest first. */
export const DEFAULT_BROWSE_VIEW = { page: 1, sort: "recent" } as const;

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
  if (year === undefined || month === undefined || day === undefined) {
    return "";
  }
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  return isReal ? raw : "";
}

/** Reads the feed's view back from a query string. */
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
