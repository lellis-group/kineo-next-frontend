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

/** A view write, as the URL hook exposes it. */
type WriteView = (
  next: { filters: BrowseFormFilters; page: number; sort: BrowseSort },
  method: "replace" | "push",
  kind: "filters" | "page",
) => void;

/**
 * Pointing at something, in the two directions the screen supports.
 *
 * Two states, because two durations: the hover is a preview that lasts as long
 * as the pointer, and the choice is a selection that lasts until it is
 * dismissed — a choice that went dark when the mouse left the row would close
 * the map's card with it.
 *
 * The chosen posting may not be on the current page, so a pick turns to the page
 * that holds it before scrolling. That read is shared by both directions and
 * owned here, so only one of them asks the server where a posting lives.
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

  /**
   * The chosen posting's row, when it happens to be on the page on screen.
   *
   * Looked up, not stored: the row is already in the response the screen holds,
   * and a second copy would be one more state that can drift as the reader
   * pages. When the row is on another page this is null and the map's preview
   * answers instead.
   */
  const selectedRow = useMemo(
    (): BrowseSelection | null =>
      (selectedListing &&
        data.listings.find((listing) => listing.id === selectedListing.id)) ||
      null,
    [data.listings, selectedListing],
  );

  /**
   * What the rail's selection panel draws. The row is preferred because it is
   * the fuller fact — specialty, urgency — and only when the row is off screen
   * does the preview answer.
   */
  const selection: BrowseSelection | null = selectedRow ?? selectedPreview;

  /**
   * Turns the page to the one holding `id`, then scrolls to it.
   *
   * A `replace`, not a `push`: the reader picked a posting, they did not page to
   * it, and a jump they never asked for must not become a back-button stop.
   * Resolves with the `/page-of` answer: `found` means the URL write happened
   * and the row is on its way; `missing` and `unavailable` are handed back
   * untouched so the caller can say which one it was. The catch is for anything
   * between the read and the write — this promise is not awaited by every
   * caller, so it must not reject.
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

  /**
   * The after-motion of a pick — the glow, the waited-for page turn, the
   * sentence a screen reader hears — is `usePickLanding`'s. This hook calls it
   * at the moment of the pick and delegates the two drops: a page turn keeps
   * the choice and clears the landing only, while a dismissed choice takes
   * both.
   */
  const landing = usePickLanding({
    page: data.page,
    totalPages: data.totalPages,
    onScreenIds,
    turnToPage,
  });

  /**
   * Brings a posting picked on the map to the reader in the list.
   *
   * The two halves of this screen are one set of rows seen two ways, and the
   * map covers the whole collection rather than the page — the posting picked
   * may be nowhere on screen, so this turns to the page that holds it first,
   * and scrolls once those rows have landed.
   *
   * `block: "center"` because the list is taller than the viewport: the reader
   * is looking at a map some hundreds of pixels above the list.
   *
   * It also *chooses* the posting. Both doors into this screen — a marker and a
   * row — must land on the same state. The pick brought the whole preview, not
   * just an id, so the rail can name the posting before its row renders.
   */
  const pickListing = useCallback(
    (listing: MapPlaceListing) => {
      // In « Carte seule » the list is not drawn, so scrolling a row into view
      // has nothing to scroll. The popup's action is « see this in the list », so
      // the honest answer is to reveal the list.
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

      // The glow and the words are `usePickLanding`'s — this hook adds only the
      // scroll that goes with them: when the row is already on screen it is
      // scrolled to now; when it is elsewhere the landing has turned the page
      // and its own effect waits for the row to really arrive.
      if (landing.landPick(listing)) {
        scrollTo(listing.id);
      }
    },
    [layout, landing, scrollTo, setLayout],
  );

  /**
   * The other direction: a posting chosen in the list comes to the map.
   *
   * The camera flies whatever page the row is on: the map is the same map. The
   * row then scrolls into view, by way of the same page-turning read
   * `pickListing` uses. A posting with no coordinates simply selects: its
   * practice was never geocoded, so there is nothing to fly to.
   *
   * No glow here, on purpose: the row was already on screen, so nothing changed
   * under the reader.
   */
  const selectListing = useCallback(
    (listing: BrowseListing) => {
      setHoveredListingId(listing.id);
      // The row is in hand — the panel keeps it through a later page turn.
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

      // In « Liste seule » the map is not drawn, so a camera move has nowhere to
      // land. The row's title is a « voir sur la carte » action, so the honest
      // answer is to reveal the map: switching to the split mounts it and the
      // map opens this posting's card.
      if (layout === "list") {
        setLayout("split");
        return;
      }

      mapRef.current?.focusOn(listing.location);

      // On a phone the map is a screen away *above* the list, and a camera move
      // nobody can see is a camera that did not move. Brought back only when it
      // is out of view.
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

  /**
   * Drops the choice — Escape on the map, a click outside, the panel's close.
   * The landing goes with it: the glow, the pending turn, the words.
   */
  const clearSelection = useCallback(() => {
    setSelectedListing(null);
    setSelectedPreview(null);
    landing.clear();
  }, [landing]);

  /** Brings the chosen posting's row back into view, from the rail's panel. */
  const revealSelection = useCallback(() => {
    if (!selection) return;
    if (selection.location) {
      pickListing({ ...selection, location: selection.location });
      return;
    }

    /*
      A practice that was never geocoded has no pin to fly to, but it still has
      a row, and the panel's promise is « Voir dans la liste ». `pickListing`
      needs coordinates to fly the camera, so it cannot carry this case; the
      old guard simply returned and left the button doing nothing. Reveal the
      row directly instead: scroll to it when the page already holds it, turn
      to its page otherwise.
    */
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
