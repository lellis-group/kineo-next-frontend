"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import type { BrowseSort } from "@/components/molecules/listings-toolbar";
import { ListingsView } from "@/components/templates/listings-view";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import {
  type BrowseFormFilters,
  type BrowseListingsData,
  type BrowseView,
  EMPTY_BROWSE_FILTERS,
  fetchBrowseListings,
  horizonForStart,
  horizonStart,
  isDefaultBrowseView,
  toBrowseView,
} from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";
import type { Specialty } from "@/lib/types/api";

/**
 * The map, loaded only in the browser.
 *
 * `ssr: false` is not an optimisation here, it is a requirement: MapLibre opens
 * a WebGL context and reads `window` on import, so a server render of this module
 * throws before the first byte of HTML. Next only honours `ssr: false` from a
 * client component, which is why this file is one.
 */
const ListingsMap = dynamic(
  () =>
    import("@/components/organisms/listings-map").then((m) => m.ListingsMap),
  {
    ssr: false,
    loading: () => (
      <div className="size-full rounded-2xl bg-surface" aria-hidden="true" />
    ),
  },
);

/**
 * Owns the browse screen's state: which filters, which page, and how the rows
 * are ordered.
 *
 * The split is the same as on the other three console screens. The server sends
 * the default view — no filter, first page — so the route paints with content on
 * arrival; every other combination is client state that fetches, through the
 * shared `usePaginatedResource` hook and its cancellation guard.
 *
 * The filters are one object rather than five states. Handing the toolbar
 * `filters` and `onFiltersChange(patch)` collapses seven `useState`s and seven
 * near-identical handlers into one merge, and it puts the "every filter change
 * returns to page 1" rule in one place instead of in each handler — which is
 * what it was for, since a filter that keeps page 4 hands the reader an empty
 * screen and a pager offering pages that no longer exist.
 */
export function ListingsContainer({
  initialData,
}: {
  initialData: BrowseListingsData;
}) {
  const [filters, setFilters] =
    useState<BrowseFormFilters>(EMPTY_BROWSE_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<BrowseSort>("recent");
  const [activeListingId, setActiveListingId] = useState<string | null>(null);

  const view = useMemo(() => toBrowseView(filters, page), [filters, page]);

  /**
   * Applies a filter change and returns to the first page.
   *
   * Not a nicety: the new result set is frequently shorter than the old one, and
   * staying on page 4 would show nothing while the pagination still offered four
   * pages. It also covers clearing a filter, which is how a reader recovers from
   * exactly that.
   */
  const applyFilters = useCallback((patch: Partial<BrowseFormFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    setActiveListingId(null);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_BROWSE_FILTERS);
    setPage(1);
    setActiveListingId(null);
  }, []);

  /**
   * Fetches one view.
   *
   * Sorting is deliberately absent: the endpoint takes no ordering parameter, so
   * whatever comes back is newest-first by the server's own rule. Reordering
   * happens once, on the rows already in hand, below.
   */
  const load = useCallback(
    (target: BrowseView) => fetchBrowseListings(target),
    [],
  );

  const { data, error, loading, reload } = usePaginatedResource({
    initialData,
    view,
    isDefaultView: isDefaultBrowseView,
    load,
  });

  /**
   * Which period chip is lit, read back from the date field rather than stored.
   *
   * The two date inputs and the segmented row write the same `from`, so keeping
   * a second copy of the choice would let them disagree: pick « Ce mois », then
   * clear the lower date by hand, and the row would still claim a narrowing the
   * results no longer have.
   */
  const horizon = horizonForStart(filters.from || undefined);

  const specialties = useMemo(
    () =>
      (Object.keys(SPECIALTY_LABELS) as Specialty[]).map((id) => ({
        id,
        label: SPECIALTY_LABELS[id],
      })),
    [],
  );

  /**
   * The rows as the reader asked for them.
   *
   * This sorts the page in hand, and only the page in hand — the feed endpoint
   * exposes no sort parameter, so there is no honest way to order the whole
   * collection from here. The control therefore orders what is on screen and
   * nothing more, which is a real limit of the contract rather than something
   * this component papers over.
   */
  const sorted = useMemo(() => {
    if (sort === "recent") {
      return data.listings;
    }
    const listings = [...data.listings];
    if (sort === "urgent") {
      listings.sort(
        (a, b) =>
          Number(b.urgent) - Number(a.urgent) ||
          b.startDate.localeCompare(a.startDate),
      );
    } else {
      listings.sort((a, b) => a.startDate.localeCompare(b.startDate));
    }
    return listings;
  }, [data.listings, sort]);

  return (
    <>
      {error != null && (
        <div className="mx-auto w-full max-w-[100rem] px-4 pt-6 sm:px-6">
          <InlineRetryBanner noun="Les annonces affichées" onRetry={reload} />
        </div>
      )}

      <ListingsView
        facets={data.facets}
        filtered={!isDefaultBrowseView(view)}
        onResetFilters={resetFilters}
        toolbar={{
          filters,
          onFiltersChange: applyFilters,
          specialties,
          total: data.total,
        }}
        results={{
          listings: sorted,
          totalPages: data.totalPages,
          page: data.page,
          onPageChange: setPage,
          loading,
          filtered: !isDefaultBrowseView(view),
          horizon,
          onHorizonChange: (next) =>
            applyFilters({ from: horizonStart(next) ?? "" }),
          sort,
          onSortChange: setSort,
          activeListingId,
          onActiveListingChange: setActiveListingId,
        }}
        map={
          <ListingsMap
            listings={sorted}
            activeListingId={activeListingId}
            onActiveListingChange={setActiveListingId}
          />
        }
      />
    </>
  );
}
