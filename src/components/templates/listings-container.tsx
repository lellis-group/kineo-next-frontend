"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { forwardRef, Suspense, use, useCallback } from "react";
import { ListingsView } from "@/components/templates/listings-view";
import { useBrowsePicking } from "@/lib/hooks/use-browse-picking";
import { useBrowseResource } from "@/lib/hooks/use-browse-resource";
import { useBrowseView } from "@/lib/hooks/use-browse-view";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
import {
  type BrowseFacets,
  type BrowseFormFilters,
  type BrowseHorizon,
  type BrowseListingsData,
  type BrowsePlacesData,
  type BrowseSort,
  horizonBounds,
} from "@/lib/listings";

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
      <div className="size-full rounded-card bg-map-base" aria-hidden="true" />
    ),
  },
);

/**
 * The browse screen's composition root.
 *
 * The work is split three ways, and the split is the point:
 *
 * - `useBrowseView` owns the URL — filters, page, sort, layout — because a
 *   filtered search here has to be shareable and walkable with the back button;
 * - `useBrowseResource` owns the server-seeded rows and the table/map handles;
 * - `useBrowsePicking` owns pointing at a posting, in both directions.
 *
 * What remains here is composition: a filter change also drops the current
 * choice, a page turn also drops the transient glow, and a horizon chip is a
 * filter change with bounds. Those are cross-cutting rules, so they stay in the
 * one place that can see all three hooks.
 *
 * The server answers every view by re-rendering: `page.tsx` reads the same query
 * string and seeds the three reads, so all of them arrive as fresh
 * `initialData`/`initialFacets`/`initialPlaces` on each navigation. There is no
 * client fetch on this screen.
 */
export function ListingsContainer({
  initialData,
  initialFacets,
  initialPlaces,
}: {
  initialData: BrowseListingsData;
  initialFacets: BrowseFacets;
  initialPlaces: Promise<BrowsePlacesData | null>;
}) {
  const browse = useBrowseView();
  const resource = useBrowseResource(initialData, browse.view);
  const router = useRouter();
  const picking = useBrowsePicking({
    view: browse.view,
    filters: browse.filters,
    sort: browse.sort,
    writeView: browse.writeView,
    layout: browse.layout,
    setLayout: browse.setLayout,
    data: resource.data,
    onScreenIds: resource.onScreenIds,
    scrollTo: resource.scrollTo,
    clearScroll: resource.clearScroll,
    tableRef: resource.tableRef,
    mapRef: resource.mapRef,
  });

  /** A view change that narrows or reorders the collection drops the choice. */
  const dropChoice = useCallback(() => {
    picking.setHoveredListingId(null);
    picking.clearSelection();
  }, [picking.clearSelection, picking.setHoveredListingId]);

  const onFiltersChange = useCallback(
    (patch: Partial<BrowseFormFilters>) => {
      dropChoice();
      browse.applyFilters(patch);
    },
    [browse.applyFilters, dropChoice],
  );

  const onSortChange = useCallback(
    (next: BrowseSort) => {
      dropChoice();
      browse.applySort(next);
    },
    [browse.applySort, dropChoice],
  );

  const onResetFilters = useCallback(() => {
    dropChoice();
    browse.resetFilters();
  }, [browse.resetFilters, dropChoice]);

  /**
   * A page turn drops only the transient pick. The choice itself stays: the
   * reader is looking at another slice of the same collection, not at a
   * different question.
   */
  const onPageChange = useCallback(
    (next: number) => {
      picking.clearTransientPick();
      browse.changePage(next);
    },
    [browse.changePage, picking.clearTransientPick],
  );

  return (
    /*
      The rail's busy state, read off what is in flight: the panels are
      aggregates of the collection, so a page turn — however it was asked for —
      gives them nothing to recompute, and a filter or a sort does. The results
      panel dims for both; this is the one that must not lie.
    */
    <ListingsView
      rail={{
        facets: initialFacets,
        filters: browse.filters,
        onFiltersChange,
        selection: picking.selection,
        onSelectionReveal: picking.revealSelection,
        onSelectionClear: picking.clearSelection,
        busy: browse.isNavigating && browse.pendingWrite === "filters",
      }}
      toolbar={{
        filters: browse.filters,
        onFiltersChange,
        specialties: browse.specialties,
        filtered: browse.filtered,
        onResetFilters,
        total: resource.data.total,
        sort: browse.sort,
        onSortChange,
        layout: browse.layout,
        onLayoutChange: browse.setLayout,
      }}
      layout={browse.layout}
      results={{
        listings: resource.data.listings,
        total: resource.data.total,
        totalPages: resource.data.totalPages,
        page: resource.data.page,
        onPageChange,
        // The pagination hook's `loading` never fires on this screen — there is
        // no client fetch. The pending signal that matters is the server
        // navigation the URL write started, so the list dims while the new rows
        // are in flight.
        loading: resource.loading || browse.isNavigating,
        filtered: browse.filtered,
        horizon: browse.horizon,
        onHorizonChange: (next: BrowseHorizon) =>
          onFiltersChange(horizonBounds(next)),
        onHoveredChange: picking.setHoveredListingId,
        selectedListingId: picking.selectedListing?.id ?? null,
        onListingSelect: picking.selectListing,
        // The mark itself, the words about it, and the pager flash — the three
        // answers to « what changed » one pick can make on this half.
        spotlight: picking.spotlight,
        announcement: picking.announcement,
        pageHighlight:
          picking.spotlight && resource.data.page !== picking.spotlight.fromPage
            ? picking.spotlight.nonce
            : null,
        onResetFilters,
        tableRef: resource.tableRef,
      }}
      map={
        <Suspense
          fallback={
            <div
              className="size-full rounded-card bg-map-base"
              aria-hidden="true"
            />
          }
        >
          <ListingsMapSlot
            ref={resource.mapRef}
            places={initialPlaces}
            pagePoints={resource.data.listings.flatMap((listing) =>
              listing.location ? [listing.location] : [],
            )}
            hoveredListingId={picking.hoveredListingId}
            onHoveredChange={picking.setHoveredListingId}
            selectedListing={picking.selectedListing}
            onSelectionClear={picking.clearSelection}
            onMarkerSelect={picking.pickListing}
            onListingPick={picking.pickListing}
            onListingOpen={(listing) => router.push(`/listings/${listing.id}`)}
          />
        </Suspense>
      }
    />
  );
}

/**
 * The map, and the promise its first read arrived in.
 *
 * The seed for this map is not awaited in the page: `/places` is the heaviest
 * read on this screen and the biggest payload in the response, and holding the
 * rows behind it meant the list a reader actually reads waited on a map that is
 * drawn by a chunk that has not loaded yet. So the read stays a promise until
 * here, inside its own boundary, and the rows paint without it.
 *
 * `use()` suspends this component — not the container — which is what puts the
 * boundary in the right place. It is called on a promise either way, whether the
 * data is the server's seed or one a filter change has since resolved, so the
 * order of the hook never changes.
 *
 * The `ref` passes straight through: a handle is a prop, and the component that
 * owns it is the one that forwards it. Holding it here instead would mean the
 * container reached *through* a `Suspense` boundary to a node this component
 * renders, which is the one thing a boundary exists to prevent.
 */
type MapSlotProps = Omit<
  React.ComponentProps<typeof ListingsMap>,
  "places" | "unlocated" | "totalPlaces" | "truncated"
> & { places: Promise<BrowsePlacesData | null> };

const ListingsMapSlot = forwardRef<ListingsMapHandle, MapSlotProps>(
  function ListingsMapSlot({ places, ...rest }, ref) {
    const resolved = use(places);

    return (
      <ListingsMap
        ref={ref}
        places={resolved?.places ?? []}
        unlocated={resolved?.unlocated ?? 0}
        totalPlaces={resolved?.totalPlaces ?? 0}
        truncated={resolved?.truncated ?? false}
        {...rest}
      />
    );
  },
);
