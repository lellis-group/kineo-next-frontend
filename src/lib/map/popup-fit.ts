import type { Map as MapLibreMap } from "maplibre-gl";
import type { Rect } from "./popup-placement";

/**
 * The two measurements `placePopup` needs from the DOM: the part of the map a
 * card may cover, and the card's size before it is shown.
 */

/** How far a card is kept from the map's edges, in pixels. */
export const POPUP_EDGE_MARGIN = 12;

/** Distance between a marker's centre and the card beside it, in pixels. */
export const POPUP_GAP = 18;

/**
 * Marks an element floating over the map's top edge — the filter pills from
 * `lg` up. A card is kept below it: drawn over the pills, it would hide the
 * controls the reader uses to change what the map shows.
 */
export const MAP_TOP_OVERLAY_ATTRIBUTE = "data-map-overlay";

/**
 * The map's free area, in its container's pixels.
 *
 * The container minus a margin on every side, and minus whatever is marked as
 * floating over its top edge. An overlay counts only when it actually sits on
 * the map: below `lg` the same bar is laid out above the map, and its box ends
 * where the map's begins.
 */
export function freeArea(map: MapLibreMap): Rect {
  const container = map.getContainer();
  const frame = container.getBoundingClientRect();

  let top = POPUP_EDGE_MARGIN;
  for (const overlay of document.querySelectorAll(
    `[${MAP_TOP_OVERLAY_ATTRIBUTE}]`,
  )) {
    const rect = overlay.getBoundingClientRect();
    const onMap =
      rect.height > 0 &&
      rect.bottom > frame.top &&
      rect.top < frame.top + frame.height / 2 &&
      rect.left < frame.right &&
      rect.right > frame.left;
    if (onMap) {
      top = Math.max(top, rect.bottom - frame.top + POPUP_EDGE_MARGIN);
    }
  }

  return {
    top,
    left: POPUP_EDGE_MARGIN,
    right: frame.width - POPUP_EDGE_MARGIN,
    bottom: frame.height - POPUP_EDGE_MARGIN,
  };
}

/**
 * The card's size as the popup will draw it, measured before it is shown.
 *
 * The anchor is a constructor option, so it has to be known before the popup
 * exists — and the card's height depends on its text. The body is laid out once
 * in a hidden copy of the popup's own wrapper, inside the map container, so the
 * same stylesheet rules apply, then handed back for the real popup to adopt.
 * `offsetWidth`/`offsetHeight` ignore the opening animation's `scale`.
 */
export function measureCard(
  map: MapLibreMap,
  body: HTMLElement,
): { width: number; height: number } {
  const host = document.createElement("div");
  host.className = "maplibregl-popup";
  host.style.visibility = "hidden";
  host.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "maplibregl-popup-content";
  content.append(body);
  host.append(content);

  map.getContainer().append(host);
  const size = { width: content.offsetWidth, height: content.offsetHeight };
  host.remove();
  body.remove();

  return size;
}
