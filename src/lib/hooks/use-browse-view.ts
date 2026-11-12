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
 * The browse screen's view, read from and written to the URL — unlike the
 * console screens, so a filtered search can be shared and walked back through.
 * The layout stays client state: a visual reflow isn't worth a round trip.
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

  useEffect(() => {
    if (!isNavigating) setPendingWrite(null);
  }, [isNavigating]);

  const view = useMemo(
    () => toBrowseView(filters, page, sort),
    [filters, page, sort],
  );

  /**
   * `method` is the history policy: `replace` for filters and sort, `push` for
   * the pager. `kind` feeds the rail's busy state — a page turn made on the
   * reader's behalf is a `replace` and still a page.
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

  /** A filter change returns to the first page, in the same URL write. */
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

  /** A `push`, so the back button walks the pages. */
  const changePage = useCallback(
    (next: number) => {
      writeView({ filters, page: next, sort }, "push", "page");
    },
    [filters, sort, writeView],
  );

  // Derived from the date fields rather than stored, so the two can't disagree.
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
