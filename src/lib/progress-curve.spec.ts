import { describe, expect, test } from "bun:test";
import {
  ARC,
  arcYAt,
  BOX,
  SCALE,
  SVG_HEIGHT,
  SVG_TOP,
  scaleX,
  splitCaption,
} from "./progress-curve";

describe("progress curve geometry", () => {
  test("maps 0 and 100 to the ends of the drawn scale", () => {
    expect(scaleX(0)).toBe(SCALE.from);
    expect(scaleX(100)).toBe(SCALE.to);
    expect(scaleX(50)).toBe((SCALE.from + SCALE.to) / 2);
  });

  test("keeps the marker inside the box at both ends", () => {
    for (const percent of [0, 25, 50, 75, 100]) {
      const y = SVG_TOP + arcYAt(scaleX(percent));
      expect(y).toBeGreaterThan(SVG_TOP);
      expect(y).toBeLessThan(SVG_TOP + SVG_HEIGHT);
    }
  });

  test("bows the curve above its ends", () => {
    const middle = arcYAt((ARC.x0 + ARC.x1) / 2);
    const end = arcYAt(ARC.x0);
    expect(middle).toBeLessThan(end);
    expect(end).toBeCloseTo(ARC.chordY);
  });

  test("draws the arc in the box's own units", () => {
    expect(SVG_TOP + SVG_HEIGHT).toBe(BOX);
  });
});

describe("splitCaption", () => {
  test("marks figures apart from words", () => {
    expect(splitCaption("3 annonces urgentes sur 10")).toEqual([
      { text: "3 ", figure: true },
      { text: "annonces urgentes sur ", figure: false },
      { text: "10", figure: true },
    ]);
  });

  test("keeps a percentage together with its sign", () => {
    expect(splitCaption("33 % de la page")).toEqual([
      { text: "33 %", figure: true },
      { text: " de la page", figure: false },
    ]);
  });

  test("keeps a figure with a thin space and a decimal comma", () => {
    expect(splitCaption("1\u202f234,5 sur 2")).toEqual([
      { text: "1\u202f234,5 ", figure: true },
      { text: "sur ", figure: false },
      { text: "2", figure: true },
    ]);
  });

  test("returns a single word part when there is no figure", () => {
    expect(splitCaption("Aucune annonce")).toEqual([
      { text: "Aucune annonce", figure: false },
    ]);
  });
});
