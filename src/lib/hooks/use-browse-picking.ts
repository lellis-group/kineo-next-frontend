"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isInView } from "@/lib/dom";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
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
  type ListingSpotlight,
  type ListingsTableHandle,
  type MapPlaceListing,
} from "@/lib/listings";

/** How long the pick's glow lasts before the screen lets it go. */
const SPOTLIGHT_MS = 1_800;

/**
 * What a screen reader hears when the picked row is already on screen.
 *
 * The visual answer to « what changed » is the row's own glow; this is the same
 * answer in words, and it never mentions the pager, because the pager did not
 * move.
 */
function pickAnnouncement(listing: BrowseSelection): string {
  const where = listing.city ? `, ${listing.city}` : "";
  return `Annonce sélectionnée : ${listing.title}${where}.`;
}

/**
 * Same, for the pick that turned the list.
 *
 * The pager's flash is colour alone, so the turn is named here — this is the
 * only place the reader is told which page they were brought to.
 */
function pickMovedAnnouncement(
  listing: BrowseSelection,
  page: number,
  totalPages: number,
): string {
  return `${pickAnnouncement(listing)} Page ${page} sur ${totalPages}.`;
}

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
 * dismissed. They were one value once, which meant a posting chosen in the table
 * went dark the moment the mouse left its row — the map's card closed with it.
 *
 * The chosen posting may not be on the current page, so a pick turns to the page
 * that holds it before scrolling. That read is shared by both directions and
 * owned here, so only one of them asks the server where a posting lives.
 */
export function useBrowsePicking({
  view,
  filters,
  page,
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
  page: number;
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
   * The one-shot mark a pick leaves on its row. Not the selection: the
   * selection lasts until dismissed, this lasts about two seconds.
   */
  const [spotlight, setSpotlight] = useState<ListingSpotlight | null>(null);

  /**
   * A pick whose row is on another page, waiting for the turn to land. The glow
   * must not start at the click: at that moment the row is not in the DOM.
   */
  const [pendingPick, setPendingPick] = useState<{
    listing: BrowseSelection;
    fromPage: number;
  } | null>(null);

  /** What a screen reader hears after a pick — the visual glow in words. */
  const [announcement, setAnnouncement] = useState("");

  /**
   * Drops the transient half of a choice: the glow, the pending turn, the words.
   * The selection itself is cleared by the callers that want that.
   */
  const clearTransientPick = useCallback(() => {
    setSpotlight(null);
    setPendingPick(null);
    setAnnouncement("");
  }, []);

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
   * Brings a posting picked on the map to the reader in the list.
   *
   * The two halves of this screen are one set of rows seen two ways, and the map
   * used to be a dead end. Now that the map covers the whole collection rather
   * than the page, the posting picked may not be on screen — so this turns to
   * the page that holds it first, and scrolls once those rows have landed.
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

      if (onScreenIds.has(listing.id)) {
        // The row is already here: the glow can start now, and say which page
        // the pick left the reader on (its own — so nothing about the pager).
        setSpotlight((current) => ({
          id: listing.id,
          nonce: (current?.nonce ?? 0) + 1,
          fromPage: page,
        }));
        setAnnouncement(pickAnnouncement(listing));
        scrollTo(listing.id);
        return;
      }

      /*
        The row is on another page. The glow must not start at the click — at
        that moment there is no row under the reader — so it is armed here and
        lit by the effect below, once the turn has landed and `onScreenIds`
        actually holds the id.
      */
      setPendingPick({ listing, fromPage: page });
      turnToPage(listing.id).then((result) => {
        if (result.status === "found") return;
        // Stand down rather than leave a glow armed against a row that is not
        // coming. The two failures are not the same sentence: a posting the
        // filters no longer show is gone, while a failed lookup is the
        // connection, and the reader can try again.
        setPendingPick(null);
        setAnnouncement(
          result.status === "missing"
            ? `Annonce introuvable : ${listing.title}.`
            : `Impossible de localiser l'annonce : ${listing.title}. Réessayez.`,
        );
      });
    },
    [layout, onScreenIds, page, scrollTo, setLayout, turnToPage],
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
   * The glow goes with it: a mark whose subject has been unchosen is a lie.
   */
  const clearSelection = useCallback(() => {
    setSelectedListing(null);
    setSelectedPreview(null);
    setSpotlight(null);
    setPendingPick(null);
    setAnnouncement("");
  }, []);

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

  /*
    Places a pending glow the moment its row is really on screen.

    The page that turned to reach the row is part of the sentence, because the
    visual signal for that turn is colour alone — and the pager's flash only
    says *that* something changed, not what.
  */
  useEffect(() => {
    if (!pendingPick) return;
    if (!onScreenIds.has(pendingPick.listing.id)) return;

    const turned = data.page !== pendingPick.fromPage;
    setSpotlight((current) => ({
      id: pendingPick.listing.id,
      nonce: (current?.nonce ?? 0) + 1,
      fromPage: pendingPick.fromPage,
    }));
    setAnnouncement(
      turned
        ? pickMovedAnnouncement(pendingPick.listing, data.page, data.totalPages)
        : pickAnnouncement(pendingPick.listing),
    );
    setPendingPick(null);
  }, [pendingPick, onScreenIds, data.page, data.totalPages]);

  /**
   * Ends the glow. Without this timer the halo would stay lit until the next
   * pick, and a second reader would read the glow as live state rather than as
   * the aftermath of a click that has already settled.
   */
  useEffect(() => {
    if (!spotlight) return;
    const timer = window.setTimeout(() => setSpotlight(null), SPOTLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [spotlight]);

  return {
    hoveredListingId,
    setHoveredListingId,
    selectedListing,
    selection,
    spotlight,
    announcement,
    pickListing,
    selectListing,
    clearSelection,
    revealSelection,
    clearTransientPick,
  };
}
