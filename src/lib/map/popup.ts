import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import { markSelectedEntry, popupContent } from "./popup-card";
import { freeArea, measureCard, POPUP_GAP } from "./popup-fit";
import { placePopup, type Rect } from "./popup-placement";
import type { MapPlace, MapPlaceListing } from "./types";

/**
 * Opens the card for one marker — from a pin click or a choice made in the
 * table. A lone posting selects itself; a group waits for the reader to pick
 * an entry. The body is built by `./popup-card`.
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
    onOpen?: (listing: MapPlaceListing) => void;
    /** The posting already chosen, marked in a group's list. */
    selectedId?: string;
  },
) {
  const live = livePlaces.get(key);
  if (!live) return;

  // Already open on this marker: rebuilding would replay its entrance.
  const open = popupRef.current;
  const at = open?.isOpen() ? open.getLngLat() : null;
  if (at && at.lng === live.longitude && at.lat === live.latitude) return;

  popupRef.current?.remove();
  popupRef.current = null;

  // Read through the ref: the content is built before the popup exists.
  const body = popupContent(live, map, () => popupRef.current?.remove(), {
    onPick: (listing) => handlers.onPick?.(listing),
    onHover: (id) => handlers.onHover?.(id),
    onOpen: handlers.onOpen,
  });
  markSelectedEntry(body, handlers.selectedId);

  /*
    Placed before it is drawn, so it opens whole: capped at the free area's
    height, measured, then `placePopup` picks the side and the pan. MapLibre's
    own placement only flips the card and clips the rest.
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
    // MapLibre's default 240px cap is narrower than the card.
    maxWidth: "none",
    // Safe because the marker click stops propagation.
    closeOnClick: true,
    closeButton: true,
  })
    .setLngLat([live.longitude, live.latitude])
    .setDOMContent(body)
    .addTo(map);
  popupRef.current = popup;

  panBy(map, pan);
  keepFitted(map, popup, body);

  if (live.listings.length === 1) {
    const [only] = live.listings;
    if (only !== undefined) {
      handlers.onHover?.(only.id);
      handlers.onMarkerSelect?.(only);
    }
  }
}

/**
 * Opens the chosen posting's card once a marker covers the id *and* stands at
 * its coordinates (the same test as `paintStates`) — i.e. once the camera has
 * landed. A no-op until then.
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

    // Already open on this place: don't re-render it on a re-cluster.
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
 * On `moveend` the side and cap are recomputed but the camera is never moved
 * (that would undo the reader's gesture); on `resize` the card is also brought
 * back into view. The resize pan's own `moveend` doesn't pan, so no loop.
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
      // `setOffset` re-runs placement without rebuilding the card.
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

function capHeight(body: HTMLElement, free: Rect) {
  body.style.maxHeight = `${Math.max(0, free.bottom - free.top)}px`;
}

/** Instantaneous: the card's opening animation carries the movement. */
function panBy(map: MapLibreMap, [dx, dy]: [number, number]) {
  if (dx !== 0 || dy !== 0) map.panBy([dx, dy], { duration: 0 });
}
