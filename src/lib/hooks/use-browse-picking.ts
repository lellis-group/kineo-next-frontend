"use client";

import type { RefObject } from "react";
import { useCallback, useMemo, useState } from "react";
import { isInView } from "@/lib/dom";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
import { usePickLanding } from "@/lib/hooks/use-pick-landing";
import {
  BROWSE_MAP_ID,
  BROWSE_PAGE_SIZE,
  type BrowseFormFilters,
  type BrowseLayout,
  type BrowseListing,
  type BrowseListingsData,
  type BrowseSelection,
  type BrowseSort,
  type BrowseView,
  fetchListingPageOf,
  type ListingPageOfResult,
  type ListingsTableHandle,
  type MapPlaceListing,
} from "@/lib/listings";

type WriteView = (
  next: { filters: BrowseFormFilters; page: number; sort: BrowseSort },
  method: "replace" | "push",
  kind: "filters" | "page",
) => void;

/**
 * Hover (a preview lasting as long as the pointer) and selection (lasting until
 * dismissed), in both directions between map and list. A pick may target a row
 * on another page, so it turns to that page first.
 */
export function useBrowsePicking({
  view,
  filters,
  sort,
  writeView,
  layout,
  setLayout,
  data,
  onScreenIds,
  scrollTo,
  clearScroll,
  tableRef,
  mapRef,
}: {
  view: BrowseView;
  filters: BrowseFormFilters;
  sort: BrowseSort;
  writeView: WriteView;
  layout: BrowseLayout;
  setLayout: (layout: BrowseLayout) => void;
  data: BrowseListingsData;
  onScreenIds: Set<string>;
  scrollTo: (id: string) => void;
  clearScroll: () => void;
  tableRef: RefObject<ListingsTableHandle | null>;
  mapRef: RefObject<ListingsMapHandle | null>;
}) {
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<{
    id: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedPreview, setSelectedPreview] =
    useState<BrowseSelection | null>(null);

  /** The chosen posting's row, when it is on the page on screen. */
  const selectedRow = useMemo(
    (): BrowseSelection | null =>
      (selectedListing &&
        data.listings.find((listing) => listing.id === selectedListing.id)) ||
      null,
    [data.listings, selectedListing],
  );

  // The row is the fuller fact; the map preview answers when it is off screen.
  const selection: BrowseSelection | null = selectedRow ?? selectedPreview;

  /**
   * Turns to the page holding `id`, then scrolls to it. A `replace`: a jump the
   * reader never asked for must not become a back-button stop. Never rejects —
   * not every caller awaits it.
   */
  const turnToPage = useCallback(
    (id: string): Promise<ListingPageOfResult> => {
      scrollTo(id);
      return fetchListingPageOf(id, {
        ...view,
        limit: BROWSE_PAGE_SIZE,
      })
        .then((result) => {
          if (result.status !== "found") {
            clearScroll();
            return result;
          }
          writeView({ filters, page: result.page, sort }, "replace", "page");
          return result;
        })
        .catch((): ListingPageOfResult => {
          clearScroll();
          return { status: "unavailable" };
        });
    },
    [view, filters, sort, writeView, scrollTo, clearScroll],
  );

  const landing = usePickLanding({
    page: data.page,
    totalPages: data.totalPages,
    onScreenIds,
    turnToPage,
  });

  /** A posting picked on the map: selects it and brings its row into view. */
  const pickListing = useCallback(
    (listing: MapPlaceListing) => {
      // « Carte seule » has no list to scroll to: reveal it.
      if (layout === "map") {
        setLayout("split");
      }

      setHoveredListingId(listing.id);

      setSelectedListing({
        id: listing.id,
        latitude: listing.location.latitude,
        longitude: listing.location.longitude,
      });
      setSelectedPreview(listing);

      // Scroll now if the row is on screen; otherwise the landing turns the
      // page and waits for the row.
      if (landing.landPick(listing)) {
        scrollTo(listing.id);
      }
    },
    [layout, landing, scrollTo, setLayout],
  );

  /**
   * A posting chosen in the list: the camera flies to it, the row scrolls into
   * view. Without coordinates it just selects.
   */
  const selectListing = useCallback(
    (listing: BrowseListing) => {
      setHoveredListingId(listing.id);
      setSelectedPreview(listing);

      if (!listing.location) {
        setSelectedListing(null);
        return;
      }

      setSelectedListing({
        id: listing.id,
        latitude: listing.location.latitude,
        longitude: listing.location.longitude,
      });

      // « Liste seule » has no map: reveal it; it opens the card once mounted.
      if (layout === "list") {
        setLayout("split");
        return;
      }

      mapRef.current?.focusOn(listing.location);

      // On a phone the map may be a screen above the list.
      const card = document.getElementById(BROWSE_MAP_ID);
      if (card && !isInView(card)) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      if (!onScreenIds.has(listing.id)) {
        turnToPage(listing.id);
        return;
      }

      tableRef.current?.scrollToId(listing.id);
    },
    [layout, mapRef, onScreenIds, setLayout, tableRef, turnToPage],
  );

  /** Drops the choice, and the landing with it. */
  const clearSelection = useCallback(() => {
    setSelectedListing(null);
    setSelectedPreview(null);
    landing.clear();
  }, [landing]);

  const revealSelection = useCallback(() => {
    if (!selection) return;
    if (selection.location) {
      pickListing({ ...selection, location: selection.location });
      return;
    }

    // Never geocoded: no pin, but the row can still be revealed.
    if (onScreenIds.has(selection.id)) {
      scrollTo(selection.id);
      return;
    }
    turnToPage(selection.id);
  }, [pickListing, selection, onScreenIds, scrollTo, turnToPage]);

  return {
    hoveredListingId,
    setHoveredListingId,
    selectedListing,
    selection,
    spotlight: landing.spotlight,
    announcement: landing.announcement,
    pickListing,
    selectListing,
    clearSelection,
    revealSelection,
    clearTransientPick: landing.clear,
  };
}
