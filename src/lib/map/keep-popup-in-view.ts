import type * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * How far a card is kept from the map's edges, in pixels.
 *
 * Shared between the popup's `padding` and the nudge: MapLibre's anchor choice
 * must use the same margin or the two move the card in opposite directions.
 */
export const POPUP_EDGE_MARGIN = 12;

/**
 * Nudges the camera so a card that just opened is entirely inside the map.
 *
 * MapLibre positions a popup from its marker and clips whatever falls outside the
 * container — it has no collision detection of its own. What it *does* have is
 * anchor choice: with no `anchor` given, it flips the card above or below the
 * marker and to one side, which already covers most of the frame's edges (it is
 * why four markers fitted to the bounds of a 384px map all opened inside it).
 *
 * What that cannot do is two things, and both are the nudge's job:
 *
 * - a card near a corner can be anchored correctly and still sit off the frame,
 *   because the anchor is chosen from the marker's half of the map and not from
 *   the card's box;
 * - a card taller than the frame fits nowhere, and there the two mechanisms have
 *   to agree on losing: this one declines, and MapLibre's flip — which at least
 *   compares the room above and below the marker — decides.
 *
 * The nudge is measured, not guessed: the card's box is read after it exists in
 * the DOM, the overflow against the container's edges is the distance to move,
 * and only the axes that actually overflow move. `panBy` rather than `panTo`
 * because the offset is in screen pixels — it is the difference between two
 * rectangles, and translating that into a centre would need a projection the map
 * already does for us.
 *
 * It re-runs harmlessly on the `moveend` it causes: a re-cluster opens nothing
 * new, because the card is already at the place it was opened for.
 */
export function keepPopupInView(
  map: MapLibreMap,
  popup: maplibregl.Popup | null,
) {
  if (!popup) return;

  const frame = map.getContainer().getBoundingClientRect();
  const card = popup.getElement().getBoundingClientRect();
  if (frame.width === 0 || frame.height === 0) return;

  // Too big to place: MapLibre's own anchor choice is the better guess, because it
  // knows which side of the marker has the room, and a nudge here would fight the
  // flip it makes — the card jumping from one side of its marker to the other.
  if (
    card.height > frame.height - 2 * POPUP_EDGE_MARGIN ||
    card.width > frame.width - 2 * POPUP_EDGE_MARGIN
  ) {
    return;
  }

  let dx = 0;
  let dy = 0;

  /*
    Signs, and they are the trap in this arithmetic.
    `panBy(offset)` moves the *camera* by that offset, so the card — which is
    content — travels the other way: measured in the browser, `panBy([0, -100])`
    pushes a card 100px **down** the screen. Both deltas below are therefore the
    overflow with its sign flipped, which reads backwards and is why it is written
    out rather than left to be intuited.
  */
  const outsideLeft = frame.left + POPUP_EDGE_MARGIN - card.left;
  const outsideRight = card.right - (frame.right - POPUP_EDGE_MARGIN);
  if (outsideLeft > 0) dx = -outsideLeft;
  else if (outsideRight > 0) dx = outsideRight;

  const outsideTop = frame.top + POPUP_EDGE_MARGIN - card.top;
  const outsideBottom = card.bottom - (frame.bottom - POPUP_EDGE_MARGIN);
  if (outsideTop > 0) dy = -outsideTop;
  else if (outsideBottom > 0) dy = outsideBottom;

  if (dx !== 0 || dy !== 0) {
    /* Instantaneous: a keep-in-view nudge arriving via ease left 28px of
       residual clipping behind. The popup entrance carries the movement, so a
       snappy camera is fine. */
    map.panBy([dx, dy], { duration: 0 });
  }
}
