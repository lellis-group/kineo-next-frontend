/**
 * Where a popup goes, decided before it is drawn.
 *
 * Pure geometry, in the map container's own pixels (origin at its top-left):
 * given the free area of the map, the marker's point and the card's size, it
 * picks the side of the marker the card opens on and the camera pan that brings
 * the whole card into the free area. No DOM, no MapLibre — the caller measures,
 * this decides, and the decision is tested.
 *
 * ## Why the card always fits
 *
 * The caller caps the card's height at the free area's height (the group list
 * scrolls inside it), so there is always a camera position that shows all of
 * it. MapLibre's own placement cannot promise that: it only flips the card to
 * the roomier side of the marker and clips whatever is still outside — the
 * bottom of a tall card on a short map, the « Voir l'annonce » button included.
 *
 * ## Which side
 *
 * Beside the marker, vertically centred, as the reference draws its card: to
 * the right when the card fits there, to the left otherwise. Beside rather than
 * above or below because the map is wide and short — half a screen tall at best
 * — so the vertical room is the scarce one, and centring on the marker spends
 * it evenly. Only a map too narrow for the card beside its marker falls back to
 * above/below, on whichever side has more room.
 */

/** A MapLibre popup anchor: the side of the *card* that touches the marker. */
export type PopupAnchor = "left" | "right" | "top" | "bottom";

export interface Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PopupPlacement {
  anchor: PopupAnchor;
  /**
   * The `panBy` offset that brings the card inside the free area — `[0, 0]`
   * when it already is.
   *
   * `panBy` moves the *camera*, so the content travels the other way: a card
   * overflowing the bottom by 40px needs `[0, 40]`, which moves it up.
   */
  pan: [number, number];
}

export function placePopup({
  free,
  point,
  card,
  gap,
}: {
  /** The part of the map the card may cover: the container minus margins and overlays. */
  free: Rect;
  /** The marker, in container pixels (`map.project`). */
  point: { x: number; y: number };
  /** The card's rendered size, height already capped to the free area. */
  card: { width: number; height: number };
  /** Distance between the marker's centre and the card's nearest edge. */
  gap: number;
}): PopupPlacement {
  const anchor = chooseAnchor(free, point, card, gap);
  const box = cardBox(anchor, point, card, gap);
  return {
    anchor,
    pan: [
      overflow(box.left, box.right, free.left, free.right),
      overflow(box.top, box.bottom, free.top, free.bottom),
    ],
  };
}

function chooseAnchor(
  free: Rect,
  point: { x: number; y: number },
  card: { width: number; height: number },
  gap: number,
): PopupAnchor {
  if (point.x + gap + card.width <= free.right) return "left";
  if (point.x - gap - card.width >= free.left) return "right";
  const below = free.bottom - point.y;
  const above = point.y - free.top;
  return below >= above ? "top" : "bottom";
}

/** The card's box once anchored, before any pan. */
function cardBox(
  anchor: PopupAnchor,
  point: { x: number; y: number },
  card: { width: number; height: number },
  gap: number,
): Rect {
  switch (anchor) {
    case "left":
      return box(point.x + gap, point.y - card.height / 2, card);
    case "right":
      return box(point.x - gap - card.width, point.y - card.height / 2, card);
    case "top":
      return box(point.x - card.width / 2, point.y + gap, card);
    case "bottom":
      return box(point.x - card.width / 2, point.y - gap - card.height, card);
  }
}

function box(
  left: number,
  top: number,
  card: { width: number; height: number },
): Rect {
  return {
    left,
    top,
    right: left + card.width,
    bottom: top + card.height,
  };
}

/**
 * The pan along one axis that brings `[start, end]` inside `[min, max]`.
 *
 * The start edge wins when the card is larger than the room: its heading and
 * the close button are there, and a card cut at its far end can still be read
 * from the top.
 */
function overflow(start: number, end: number, min: number, max: number) {
  if (start < min) return start - min;
  if (end > max) return Math.min(end - max, start - min);
  return 0;
}
