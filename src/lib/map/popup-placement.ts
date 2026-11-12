/**
 * Where a popup goes, decided before it is drawn — pure geometry in container
 * pixels. The caller caps the card's height at the free area's, so a pan that
 * shows all of it always exists (MapLibre's own placement only flips and
 * clips).
 *
 * The card opens beside the marker, vertically centred (right if it fits,
 * else left), since the map is wide and short; only a map too narrow falls
 * back to above/below.
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
   * The `panBy` offset that brings the card inside the free area. `panBy`
   * moves the camera, so a card overflowing the bottom by 40px needs `[0, 40]`.
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
 * The pan along one axis that brings `[start, end]` inside `[min, max]`. When
 * the card is larger than the room, the start edge (heading, close button)
 * wins.
 */
function overflow(start: number, end: number, min: number, max: number) {
  if (start < min) return start - min;
  if (end > max) return Math.min(end - max, start - min);
  return 0;
}
