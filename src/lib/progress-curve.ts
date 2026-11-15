/**
 * Geometry of the progress curve: a 0→100 scale drawn on an arc, with the
 * marker's position derived from the percentage. Pure, so it can be tested.
 */

/**
 * The arc, in viewBox units: the SVG is `preserveAspectRatio="none"` over a
 * 100-wide viewBox, so x is a percentage of the width and y is a pixel.
 */
export const ARC = {
  x0: 0,
  x1: 100,
  /** Where the ends sit; the arc bows above them. */
  chordY: 30,
  /** How far the middle lifts above the ends. */
  lift: 12,
} as const;

const HALF_CHORD = (ARC.x1 - ARC.x0) / 2;
const RADIUS = (HALF_CHORD ** 2 + ARC.lift ** 2) / (2 * ARC.lift);
const CX = (ARC.x0 + ARC.x1) / 2;
const CY = ARC.chordY - ARC.lift + RADIUS;

/** Where 0 % and 100 % sit: inboard of the arc's ends, which fade out. */
export const SCALE = { from: 8, to: 92 } as const;

/** The box the gauge is drawn in; the SVG is pinned to its bottom. */
export const BOX = 76;
export const SVG_HEIGHT = 36;
export const SVG_TOP = BOX - SVG_HEIGHT;

export const DOT = 12;
export const TAIL = 5;
export const BADGE = 26;
export const STROKE = 3;

/** Half a callout, the most it ever overhangs its marker's position. */
export const BADGE_HALF = 24;

/** How close the marker may come to an end label before the label hides. */
export const LABEL_CLEARANCE = 14;

export const ARC_PATH = `M ${ARC.x0} ${ARC.chordY} A ${RADIUS} ${RADIUS} 0 0 1 ${ARC.x1} ${ARC.chordY}`;

/** Where a percentage sits along the scale, as a viewBox x. */
export function scaleX(percent: number): number {
  return SCALE.from + (SCALE.to - SCALE.from) * (percent / 100);
}

/** Where the curve is at a given x, so the marker can ride it. */
export function arcYAt(x: number): number {
  const dx = x - CX;
  return CY - Math.sqrt(Math.max(0, RADIUS ** 2 - dx ** 2));
}

export interface CaptionPart {
  text: string;
  /** A figure, drawn brighter than the words around it. */
  figure: boolean;
}

/** Splits a caption so its figures can be emphasised: « 3 sur 10 ». */
export function splitCaption(text: string): CaptionPart[] {
  return text
    .split(/(\d[\d\s\u202f.,]*\s?%?)/)
    .map((part, index) => ({ text: part, figure: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}
