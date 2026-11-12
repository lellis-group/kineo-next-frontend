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

/** The map, browser-only: MapLibre needs WebGL and `window` on import. */
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
 * The browse screen's composition root: `useBrowseView` owns the URL,
 * `useBrowseResource` the server-seeded rows, `useBrowsePicking` the hover and
 * selection. Cross-cutting rules (a filter change drops the choice, a page
 * turn drops the glow) live here. There is no client fetch: `page.tsx`
 * re-seeds every read on each navigation.
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

  /** A page turn drops only the transient pick; the choice stays. */
  const onPageChange = useCallback(
    (next: number) => {
      picking.clearTransientPick();
      browse.changePage(next);
    },
    [browse.changePage, picking.clearTransientPick],
  );

  return (
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
        // No client fetch here: the pending signal is the server navigation.
        loading: resource.loading || browse.isNavigating,
        filtered: browse.filtered,
        horizon: browse.horizon,
        onHorizonChange: (next: BrowseHorizon) =>
          onFiltersChange(horizonBounds(next)),
        onHoveredChange: picking.setHoveredListingId,
        selectedListingId: picking.selectedListing?.id ?? null,
        onListingSelect: picking.selectListing,
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
 * The map, behind its own `Suspense` boundary: `/places` is the heaviest read,
 * so its promise is unwrapped here with `use()` and the rows paint without it.
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
