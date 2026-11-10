import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import {
  keepPopupInView,
  POPUP_EDGE_MARGIN,
} from "@/lib/map/keep-popup-in-view";
import { popupContent } from "./popup-card";
import type { MapPlace, MapPlaceListing } from "./types";

/**
 * The card a marker opens, and when.
 *
 * Opened from two doors: a click on a pin, and a choice made in the table. Both
 * come through `openPopupForKey`, which is why opening is a function this module
 * exposes rather than a branch inside one of them — a second copy of the popup's
 * construction would drift the first time a field moved.
 *
 * What the card says to the reader lives in `./popup-card`, which builds the
 * body. This module owns the rest of the popup's life: the MapLibre instance
 * with its anchoring and its edge padding, the card that follows a choice made
 * in the table once the camera has landed, and nothing else — the split is what
 * the card is against when it opens.
 */

/**
 * Opens the card for one marker, whichever door the reader came through.
 *
 * Extracted out of the marker's click handler because the same thing now happens
 * from the list: a posting chosen in the table comes with its card on the map,
 * which is the reference's arrangement and the only way the two halves ever read
 * as one screen. Two doors, one body — the alternative is a second copy of the
 * popup's construction, and the two would drift the first time a field moved.
 *
 * A lone posting picks itself: it has no list to choose from, so the choice the
 * reader just made is propagated outward so the row can light up (and scroll into
 * view if it is not on the page). A group waits — the reader picks the entry,
 * because « trois annonces » is not a choice of any one of them.
 */
export function openPopupForKey(
  key: string,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  map: MapLibreMap,
  handlers: {
    onPick?: (listing: MapPlaceListing) => void;
    onHover?: (id: string | null) => void;
    onMarkerSelect?: (listing: MapPlaceListing) => void;
    /** The posting's own page — see `listingLink`. */
    onOpen?: (listing: MapPlaceListing) => void;
  },
) {
  const live = livePlaces.get(key);
  if (!live) return;

  popupRef.current?.remove();
  popupRef.current = new maplibregl.Popup({
    offset: 16,
    // The very click that opened it used to close it again: the marker
    // sits inside the map, so the click bubbled up and MapLibre dismissed
    // the popup on the same event. `stopPropagation` at the click site is what
    // makes this safe — without it, `true` would mean a popup that never stays
    // open.
    closeOnClick: true,
    closeButton: true,
    /*
      MapLibre picks the card's anchor itself when none is given — above or below
      the marker, and to one side — but it does so against a padding of **zero**:
      it only moves once the card is already at the edge. Handing it the same
      margin `keepPopupInView` works with makes that decision happen a step
      earlier, so the flip and the nudge stop fighting over the same pixel and
      the card lands with air around it from the start.
    */
    padding: {
      top: POPUP_EDGE_MARGIN,
      bottom: POPUP_EDGE_MARGIN,
      left: POPUP_EDGE_MARGIN,
      right: POPUP_EDGE_MARGIN,
    },
  })
    .setLngLat([live.longitude, live.latitude])
    /**
     * The popup dismissing itself is a read of the ref rather than a
     * captured instance: the content is built before the popup exists, and
     * the two are chained in one expression. The closure resolves it on the
     * click, by which time it is set.
     */
    .setDOMContent(
      popupContent(
        live,
        map,
        () => popupRef.current?.remove(),
        (listing) => handlers.onPick?.(listing),
        handlers.onOpen,
      ),
    )
    .addTo(map);

  // A card that arrives cropped is a card the reader cannot read, and the map's
  // box is small by design — it shares the screen with the table. MapLibre has no
  // collision detection for popups, so the camera makes room instead.
  keepPopupInView(map, popupRef.current);

  // A lone posting has no list to choose from, so it selects itself: a click on
  // its pin is a choice, and a choice has to outlive the pointer that made it.
  // A group waits — the reader picks the entry.
  if (live.listings.length === 1) {
    const [only] = live.listings;
    if (only !== undefined) {
      handlers.onHover?.(only.id);
      handlers.onMarkerSelect?.(only);
    }
  }
}

/**
 * Opens the chosen posting's card, once the map can honestly show it.
 *
 * The condition is the same one `paintStates` uses — the marker covers the id and
 * stands at its coordinates — so the card opens exactly when the cream ring
 * appears. That is the point of writing both off the same test: a posting picked
 * in the list comes with its card on the map, the reference's arrangement, but
 * only once the camera has landed. Opening at the pre-flight position would
 * anchor the card to a merged cluster the reader is no longer looking at.
 *
 * A no-op while the marker has not arrived, so the reopen after a re-cluster is
 * free rather than a thing to schedule.
 */
export function openCardForSelected(
  markers: Map<string, maplibregl.Marker>,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  map: MapLibreMap,
  selected:
    | { id: string; latitude: number; longitude: number }
    | null
    | undefined,
  onPick: ((listing: MapPlaceListing) => void) | undefined,
  onOpen?: (listing: MapPlaceListing) => void,
) {
  if (!selected) return;

  for (const [key, marker] of markers) {
    const ids = marker.getElement().dataset.ids?.split(",") ?? [];
    if (!ids.includes(selected.id)) continue;
    if (
      marker.getLngLat().lng !== selected.longitude ||
      marker.getLngLat().lat !== selected.latitude
    ) {
      continue;
    }
    const place = livePlaces.get(key);
    if (!place) continue;

    // Already open on this very place: a re-cluster must not re-render a card
    // the reader is reading.
    const current = popupRef.current;
    const at = current?.getLngLat();
    if (at && at.lng === place.longitude && at.lat === place.latitude) {
      return;
    }

    openPopupForKey(key, livePlaces, popupRef, map, {
      onPick,
      onHover: undefined,
      onMarkerSelect: undefined,
      onOpen,
    });
    return;
  }
}
