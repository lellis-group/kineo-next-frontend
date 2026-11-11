import { describe, expect, it } from "bun:test";
import { placePopup, type Rect } from "./popup-placement";

/** A 600 × 300 map with 12px margins and a 60px toolbar over its top. */
const free: Rect = { top: 60, left: 12, right: 588, bottom: 288 };
const card = { width: 280, height: 160 };
const gap = 18;

function cardRect(
  anchor: string,
  point: { x: number; y: number },
  pan: [number, number],
) {
  const x = point.x - pan[0];
  const y = point.y - pan[1];
  switch (anchor) {
    case "left":
      return { left: x + gap, top: y - card.height / 2 };
    case "right":
      return { left: x - gap - card.width, top: y - card.height / 2 };
    case "top":
      return { left: x - card.width / 2, top: y + gap };
    default:
      return { left: x - card.width / 2, top: y - gap - card.height };
  }
}

describe("placePopup", () => {
  it("opens to the right of the marker, as the reference does", () => {
    const placement = placePopup({
      free,
      point: { x: 100, y: 170 },
      card,
      gap,
    });
    expect(placement).toEqual({ anchor: "left", pan: [0, 0] });
  });

  it("opens to the left when the right side has no room", () => {
    const placement = placePopup({
      free,
      point: { x: 500, y: 170 },
      card,
      gap,
    });
    expect(placement.anchor).toBe("right");
  });

  it("pans a card that would hang off the bottom back into view", () => {
    // The reported bug: a marker near the bottom of a short map.
    const point = { x: 100, y: 270 };
    const placement = placePopup({ free, point, card, gap });
    const box = cardRect(placement.anchor, point, placement.pan);
    expect(box.top + card.height).toBeLessThanOrEqual(free.bottom);
    expect(box.top).toBeGreaterThanOrEqual(free.top);
  });

  it("keeps the card below an overlay along the top edge", () => {
    const point = { x: 100, y: 70 };
    const placement = placePopup({ free, point, card, gap });
    const box = cardRect(placement.anchor, point, placement.pan);
    expect(box.top).toBeGreaterThanOrEqual(free.top);
  });

  it("falls back to above or below on a map too narrow for either side", () => {
    const narrow: Rect = { top: 12, left: 12, right: 330, bottom: 488 };
    const below = placePopup({
      free: narrow,
      point: { x: 170, y: 100 },
      card,
      gap,
    });
    expect(below.anchor).toBe("top");

    const above = placePopup({
      free: narrow,
      point: { x: 170, y: 420 },
      card,
      gap,
    });
    expect(above.anchor).toBe("bottom");
  });

  it("brings every edge inside the free area wherever the marker is", () => {
    for (const x of [15, 150, 300, 450, 585]) {
      for (const y of [62, 120, 200, 286]) {
        const point = { x, y };
        const { anchor, pan } = placePopup({ free, point, card, gap });
        const box = cardRect(anchor, point, pan);
        expect(box.left).toBeGreaterThanOrEqual(free.left);
        expect(box.left + card.width).toBeLessThanOrEqual(free.right);
        expect(box.top).toBeGreaterThanOrEqual(free.top);
        expect(box.top + card.height).toBeLessThanOrEqual(free.bottom);
      }
    }
  });
});
