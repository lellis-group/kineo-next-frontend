"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  type BrowseFormFilters,
  type BrowseLayout,
  type BrowseSort,
  browseViewFromParams,
  browseViewToParams,
  EMPTY_BROWSE_FILTERS,
  horizonForBounds,
  isDefaultBrowseView,
  toBrowseView,
} from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";
import type { Specialty } from "@/lib/types/api";

/**
 * The browse screen's view, read from and written to the URL.
 *
 * This screen is the odd one out among the four console screens, and on purpose.
 * The other three hold their filter, page and bucket in `useState` and fetch
 * client-side; this one writes the query string and lets the server answer. The
 * difference is the reader's expectation: a filtered search here is something to
 * share, to bookmark and to walk back through with the back button, and none of
 * that survives a `useState`.
 *
 * `filters`, `page` and `sort` are read from `useSearchParams` — the single
 * source of truth — and every change is a `router.push`/`replace`. The layout
 * is the one preference that stays client state: a purely visual reflow is not
 * worth a round trip on a screen whose URL write re-reads three endpoints.
 *
 * The hook owns no selection state. Clearing a choice when a filter changes is
 * the container's composition, so this module stays about the URL alone.
 */
export function useBrowseView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  const paramsKey = searchParams.toString();
  const { filters, page, sort } = useMemo(
    () => browseViewFromParams(new URLSearchParams(paramsKey)),
    [paramsKey],
  );

  const [layout, setLayout] = useState<BrowseLayout>("split");
  const [pendingWrite, setPendingWrite] = useState<"filters" | "page" | null>(
    null,
  );

  /**
   * Forgets what the last write was about once it has landed.
   *
   * `pendingWrite` is only read while `isNavigating`, so a stale value would
   * never show — but left alone it would stay `"filters"` long after a filter
   * change settled, and the next reader of the field would have to know that.
   * Cleared here, it means exactly one thing: the kind of write in flight.
   */
  useEffect(() => {
    if (!isNavigating) setPendingWrite(null);
  }, [isNavigating]);

  const view = useMemo(
    () => toBrowseView(filters, page, sort),
    [filters, page, sort],
  );

  /**
   * Writes a view to the URL, which is how every view change happens.
   *
   * `method` is the history policy: `replace` for a filter or a sort, so a
   * reader who narrows three fields does not build three back-button stops to
   * walk back through; `push` for the pager, where turning back a page is
   * exactly what the reader expects. `kind` names what the write is about, for
   * the rail's busy state — it is not derivable from `method`, since a page turn
   * made on the reader's behalf is a `replace` and still a page.
   */
  const writeView = useCallback(
    (
      next: { filters: BrowseFormFilters; page: number; sort: BrowseSort },
      method: "replace" | "push",
      kind: "filters" | "page",
    ) => {
      const query = browseViewToParams(next.filters, next.page, next.sort);
      const search = query.toString();
      const url = search ? `${pathname}?${search}` : pathname;
      setPendingWrite(kind);
      startTransition(() => {
        if (method === "push") router.push(url);
        else router.replace(url);
      });
    },
    [pathname, router],
  );

  /**
   * Applies a filter change and returns to the first page.
   *
   * The new result set is frequently shorter than the old one, and staying on
   * page 4 would show nothing while the pagination still offered four pages.
   * The page reset is not a second write — it is folded into the one URL this
   * produces.
   */
  const applyFilters = useCallback(
    (patch: Partial<BrowseFormFilters>) => {
      writeView(
        { filters: { ...filters, ...patch }, page: 1, sort },
        "replace",
        "filters",
      );
    },
    [filters, sort, writeView],
  );

  /** Applies a reordering and returns to the first page, for the same reason. */
  const applySort = useCallback(
    (next: BrowseSort) => {
      writeView({ filters, page: 1, sort: next }, "replace", "filters");
    },
    [filters, writeView],
  );

  const resetFilters = useCallback(() => {
    writeView(
      { filters: EMPTY_BROWSE_FILTERS, page: 1, sort },
      "replace",
      "filters",
    );
  }, [sort, writeView]);

  /**
   * Turns the page. A `push`, unlike a filter change, so the back button walks
   * the pages rather than leaving the feed.
   */
  const changePage = useCallback(
    (next: number) => {
      writeView({ filters, page: next, sort }, "push", "page");
    },
    [filters, sort, writeView],
  );

  /**
   * Which period chip is lit, read back from the date fields rather than stored.
   *
   * The two date inputs and the segmented row write the same `from` *and `to`*,
   * so a second copy of the choice would let them disagree.
   */
  const horizon = horizonForBounds(
    filters.from || undefined,
    filters.to || undefined,
  );

  const specialties = useMemo(
    () =>
      (Object.keys(SPECIALTY_LABELS) as Specialty[]).map((id) => ({
        id,
        label: SPECIALTY_LABELS[id],
      })),
    [],
  );

  return {
    filters,
    page,
    sort,
    view,
    layout,
    setLayout,
    isNavigating,
    pendingWrite,
    writeView,
    applyFilters,
    applySort,
    resetFilters,
    changePage,
    horizon,
    specialties,
    filtered: !isDefaultBrowseView(view),
  };
}
