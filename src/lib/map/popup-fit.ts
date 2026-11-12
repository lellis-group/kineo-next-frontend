import type { Map as MapLibreMap } from "maplibre-gl";
import type { Rect } from "./popup-placement";

export const POPUP_EDGE_MARGIN = 12;

export const POPUP_GAP = 18;

/** Marks an element floating over the map's top edge; popups stay below it. */
export const MAP_TOP_OVERLAY_ATTRIBUTE = "data-map-overlay";

/**
 * The map's free area, in container pixels: the container minus a margin, and
 * minus any marked overlay actually sitting on the map's top edge.
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
 * The card's size, measured before the popup exists (the anchor is a
 * constructor option): laid out once in a hidden copy of the popup wrapper so
 * the same styles apply. `offset*` ignore the opening `scale`.
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
