import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import { markSelectedEntry, popupContent } from "./popup-card";
import { freeArea, measureCard, POPUP_GAP } from "./popup-fit";
import { placePopup, type Rect } from "./popup-placement";
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
 * body. This module owns whether it exists at all: the MapLibre instance with
 * its anchoring and edge padding, and the card that follows a choice made in
 * the table once the camera has landed.
 */

/**
 * Opens the card for one marker, whichever door the reader came through.
 *
 * Not inside the marker's click handler because the same thing happens from the
 * list: a posting chosen in the table comes with its card on the map,
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
    /** The posting already chosen, marked in a group's list when it is there. */
    selectedId?: string;
  },
) {
  const live = livePlaces.get(key);
  if (!live) return;

  // A click on the marker whose card is already up leaves it be: rebuilding
  // would replay its entrance, reset its list's scroll and re-place it under
  // the pointer of a reader who was about to use it.
  const open = popupRef.current;
  const at = open?.isOpen() ? open.getLngLat() : null;
  if (at && at.lng === live.longitude && at.lat === live.latitude) return;

  popupRef.current?.remove();
  popupRef.current = null;

  /**
   * The popup dismissing itself is a read of the ref rather than a captured
   * instance: the content is built before the popup exists. The closure
   * resolves it on the click, by which time it is set.
   */
  const body = popupContent(live, map, () => popupRef.current?.remove(), {
    onPick: (listing) => handlers.onPick?.(listing),
    onHover: (id) => handlers.onHover?.(id),
    onOpen: handlers.onOpen,
  });
  markSelectedEntry(body, handlers.selectedId);

  /*
    Placed before it is drawn, so it opens whole rather than clipped and then
    chased by the camera:

    1. the card is capped at the free area's height — a group's list scrolls
       inside it — so a camera position that shows all of it always exists;
    2. it is measured at that cap;
    3. `placePopup` picks the side of the marker and the pan that brings the
       whole card into view, and the pan is applied once the card is up.

    MapLibre's own placement only flips the card to the roomier side and clips
    the rest: on a short map that was the bottom of the card, buttons included.
  */
  const free = freeArea(map);
  capHeight(body, free);
  const { anchor, pan } = placePopup({
    free,
    point: map.project([live.longitude, live.latitude]),
    card: measureCard(map, body),
    gap: POPUP_GAP,
  });

  const popup = new maplibregl.Popup({
    anchor,
    offset: POPUP_GAP,
    // MapLibre caps every popup at 240px by default, on the wrapper — narrower
    // than the card, which then overflowed its own box. The card's width is the
    // stylesheet's (`.maplibregl-popup-content`).
    maxWidth: "none",
    // A click on the marker bubbles up to the map, where MapLibre would close
    // the popup this very click opened — `stopPropagation` at the click site is
    // what makes a `true` here safe.
    closeOnClick: true,
    closeButton: true,
  })
    .setLngLat([live.longitude, live.latitude])
    .setDOMContent(body)
    .addTo(map);
  popupRef.current = popup;

  panBy(map, pan);
  keepFitted(map, popup, body);

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
  handlers: {
    onPick?: (listing: MapPlaceListing) => void;
    onHover?: (id: string | null) => void;
    onOpen?: (listing: MapPlaceListing) => void;
  },
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
      ...handlers,
      selectedId: selected.id,
    });
    return;
  }
}

/**
 * Keeps an open card placed as the map moves and resizes, until it closes.
 *
 * MapLibre already carries the card with its marker on every frame. What it
 * does not do is reconsider the card's side or its height cap, both decided at
 * opening against a map that has since changed:
 *
 * - **The reader moved the map** (`moveend` — pan, zoom, or the camera flying
 *   to a posting): the side and the cap are recomputed, but the camera is never
 *   moved. Panning back would undo the gesture the reader just made, and drag
 *   the map from under them. If they pushed the card off the edge, that was
 *   their move; it comes back whole the moment there is room on either side.
 * - **The map changed size** (`resize` — the window, full screen, or the
 *   « Carte seule » / « Carte et liste » switch): the reader moved nothing, so
 *   the card is also brought back into view, as it was at opening.
 *
 * At gesture end rather than on every `move` frame: the side flipping while the
 * map is still under the pointer would make the card jump about mid-drag.
 * The pan this function makes on a resize ends in a `moveend` of its own, which
 * re-places without panning — so the two never loop.
 */
function keepFitted(
  map: MapLibreMap,
  popup: maplibregl.Popup,
  body: HTMLElement,
) {
  const refit = (bringIntoView: boolean) => {
    const content = body.parentElement;
    if (!content) return;

    const free = freeArea(map);
    capHeight(body, free);
    const { anchor, pan } = placePopup({
      free,
      point: map.project(popup.getLngLat()),
      card: { width: content.offsetWidth, height: content.offsetHeight },
      gap: POPUP_GAP,
    });

    if (popup.options.anchor !== anchor) {
      // The anchor is read from `options` on every placement; `setOffset`
      // is the public call that runs one, without rebuilding the card — its
      // list keeps its scroll position and its opening animation is not
      // replayed.
      popup.options.anchor = anchor;
      popup.setOffset(POPUP_GAP);
    }
    if (bringIntoView) panBy(map, pan);
  };

  const onMoveEnd = () => refit(false);
  const onResize = () => refit(true);
  map.on("moveend", onMoveEnd);
  map.on("resize", onResize);
  popup.once("close", () => {
    map.off("moveend", onMoveEnd);
    map.off("resize", onResize);
  });
}

/**
 * Caps the card at the free area's height. A group's list is what gives way and
 * scrolls, so the header and the actions are always on screen.
 */
function capHeight(body: HTMLElement, free: Rect) {
  body.style.maxHeight = `${Math.max(0, free.bottom - free.top)}px`;
}

/** Instantaneous: the card's opening animation carries the movement. */
function panBy(map: MapLibreMap, [dx, dy]: [number, number]) {
  if (dx !== 0 || dy !== 0) map.panBy([dx, dy], { duration: 0 });
}
