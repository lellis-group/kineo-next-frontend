"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import { ListingsView } from "@/components/templates/listings-view";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import {
  BROWSE_PAGE_SIZE,
  type BrowseFormFilters,
  type BrowseListingsData,
  type BrowsePlacesData,
  type BrowseSort,
  type BrowseView,
  EMPTY_BROWSE_FILTERS,
  fetchBrowseListings,
  fetchBrowsePlaces,
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
 * The table row standing for a posting, or `null` when it is not on this page.
 *
 * Scoped to the table, and written once so the two callers cannot drift apart.
 * Both the rows and the map's popup entries carry `data-listing-id` — the same
 * posting seen two ways, which is the point of the screen — so an unscoped
 * selector finds the popup's own button and reports a row on screen while the
 * reader is three pages short of it.
 */
function rowFor(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `tbody tr[data-listing-id="${id}"]`,
  );
}

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
 *
 * `initialData` and `initialLocations` are two answers to two questions. The
 * first is what the rows say; the second is where all of them are. They are
 * fetched separately because they are fetched for separate reasons, and the map
 * does not move when the page does.
 */
export function ListingsContainer({
  initialData,
  initialPlaces,
}: {
  initialData: BrowseListingsData;
  initialPlaces: BrowsePlacesData;
}) {
  const [filters, setFilters] =
    useState<BrowseFormFilters>(EMPTY_BROWSE_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<BrowseSort>("recent");
  const [activeListingId, setActiveListingId] = useState<string | null>(null);

  const view = useMemo(
    () => toBrowseView(filters, page, sort),
    [filters, page, sort],
  );

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

  /**
   * Applies a reordering and returns to the first page.
   *
   * Same rule as a filter: the reader changes how the rows are ordered, and
   * page 4 of the old ordering says nothing about where to land in the new
   * one.
   */
  const applySort = useCallback((next: BrowseSort) => {
    setSort(next);
    setPage(1);
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

  /**
   * The postings the map draws, held apart from the page on screen.
   *
   * Two states with two lives. The list is paged and re-fetches whenever the
   * reader pages; the map is the whole filtered collection and re-fetches only
   * when the filters change. Sharing one state was the defect — paging used to
   * redraw the map, so the same posts vanished from it and came back a page later.
   *
   * Seeded from the server's answer so the first paint already carries markers, and
   * the first effect run is skipped: the server sent exactly this data for exactly
   * these filters, and asking again would be the very request we avoided.
   */
  const [placesData, setPlacesData] = useState(initialPlaces);
  const seeded = useRef({ filters, sort });

  useEffect(() => {
    if (seeded.current.filters === filters && seeded.current.sort === sort) {
      return;
    }
    seeded.current = { filters, sort };
    let cancelled = false;

    fetchBrowsePlaces(toBrowseView(filters, 1, sort))
      .then((data) => {
        if (!cancelled) setPlacesData(data);
      })
      .catch(() => {
        // The map keeps the markers it has rather than emptying itself over a
        // failed refresh: stale pins are a smaller lie than a blank map.
      });

    return () => {
      cancelled = true;
    };
  }, [filters, sort]);

  /** Set when a posting is picked on the map but is not on the current page. */
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  /**
   * Brings a posting picked on the map to the reader in the list.
   *
   * The two halves of this screen are one set of rows seen two ways, and the map
   * used to be a dead end: a popup named a posting and offered no way to reach it.
   *
   * Now that the map covers the whole collection rather than the page, the posting
   * picked may not be on screen — so this turns to the page that holds it first,
   * and scrolls once those rows have landed, rather than scrolling to nothing.
   *
   * `block: "center"` because the list is taller than the viewport: the reader is
   * looking at a map some hundreds of pixels above the list, and `"nearest"` would
   * park the row on an edge that is itself off screen.
   */
  const pickListing = useCallback(
    (id: string) => {
      setActiveListingId(id);

      const onScreen = rowFor(id);
      if (onScreen) {
        onScreen.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Which page of the server's ordering holds it. The map's rows come from the
      // same query the list pages through, so the index decides the page — and
      // when the reader has reordered the list, its position is wherever they put
      // it, which no page number can answer.
      const position = placesData.listingIds.indexOf(id);
      setPendingScrollId(id);
      if (position >= 0) {
        setPage(Math.floor(position / BROWSE_PAGE_SIZE) + 1);
      }
    },
    [placesData.listingIds],
  );

  /**
   * Which rows are on screen, as the trigger for a pending scroll.
   *
   * Keyed on the ids rather than on `data`, which is what the effect actually
   * depends on: the row it is looking for is in the DOM or it is not, and the ids
   * are what say so. Watching the whole payload instead would re-run this on every
   * count that happens to be fetched alongside the rows.
   */
  const onScreenIds = useMemo(
    () => new Set(data.listings.map((listing) => listing.id)),
    [data.listings],
  );

  useEffect(() => {
    if (!pendingScrollId) return;
    // Not on this page yet — the turn of the page is still in flight, and the
    // effect runs again for the rows that land.
    if (!onScreenIds.has(pendingScrollId)) return;
    const row = rowFor(pendingScrollId);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    setPendingScrollId(null);
  }, [onScreenIds, pendingScrollId]);

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
          listings: data.listings,
          totalPages: data.totalPages,
          page: data.page,
          onPageChange: setPage,
          loading,
          filtered: !isDefaultBrowseView(view),
          horizon,
          onHorizonChange: (next) =>
            applyFilters({ from: horizonStart(next) ?? "" }),
          sort,
          onSortChange: applySort,
          activeListingId,
          onActiveListingChange: setActiveListingId,
        }}
        map={
          <ListingsMap
            places={placesData.places}
            unlocated={placesData.unlocated}
            activeListingId={activeListingId}
            onActiveListingChange={setActiveListingId}
            onListingPick={pickListing}
          />
        }
      />
    </>
  );
}
