import { Fragment, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A 0→100 scale with a marker on it, and a caption naming what it counts.
 *
 * An atom: it composes no other component — the arc and the marker are its own
 * `<svg>` and `<div>`s. It earns its place next to `Button` and `Badge` because
 * it is one indivisible thing the reader sees, not a section built out of
 * smaller parts.
 *
 * The caption is not decoration and the component takes it as a required prop:
 * a marker sitting on a curve with no sentence under it is a number the reader
 * has to guess the meaning of, and the obvious guess — progress towards some goal
 * — is wrong for most of the things this is used for. So the caller states what
 * the percentage is of, and the marker is drawn at the position that sentence
 * describes.
 *
 * Drawn as the reference draws its gauge: a thin arc running the full width of
 * its card, coloured along its whole length from dusty rose through cream to
 * sage and fading out at both ends, with « 0 % » and « 100 % » standing above
 * the ends, a white dot riding the arc and a white callout over the dot. The
 * whole arc is the scale; the marker alone says where the value is.
 *
 * The component bleeds to its card's edges by itself only when told to
 * (`bleed`), because the negative margin has to cancel the card's own padding
 * and only the caller knows it.
 */

/**
 * The arc, in the units it is drawn in.
 *
 * The SVG is `preserveAspectRatio="none"` over a 100-wide viewBox drawn at
 * `SVG_HEIGHT` pixels, so x is a percentage of the width and y is a pixel. The
 * chord spans the full width — the arc runs off the card's edges in the
 * reference — and the bow lifts 12px at the middle, which is the reference's
 * own lift at this card size.
 */
const ARC = {
  x0: 0,
  x1: 100,
  /** Where the ends sit; the arc bows above them. */
  chordY: 30,
  /** How far the middle lifts above the ends. */
  lift: 12,
} as const;

const HALF_CHORD = (ARC.x1 - ARC.x0) / 2;
const ARC_RADIUS = (HALF_CHORD ** 2 + ARC.lift ** 2) / (2 * ARC.lift);
const ARC_CX = (ARC.x0 + ARC.x1) / 2;
const ARC_CY = ARC.chordY - ARC.lift + ARC_RADIUS;

/**
 * Where 0 % and 100 % sit along the width.
 *
 * Inboard of the arc's ends, because the ends fade out: a value of 0 drawn on
 * the transparent tip would be a dot floating on nothing. 8 % is where the
 * reference prints its end labels, and where its scale starts reading.
 */
const SCALE = { from: 8, to: 92 } as const;

/** The x, in percent of the width, that a value is drawn at. */
function scaleX(percent: number): number {
  return SCALE.from + (SCALE.to - SCALE.from) * (percent / 100);
}

/**
 * Where the curve is at a given x, in viewBox units (pixels from the SVG top).
 *
 * The marker rides this instead of sitting at a fixed height: pinned to one
 * `top`, the dot would touch the curve near the middle and float above it
 * towards the ends.
 */
function arcYAt(x: number): number {
  const dx = x - ARC_CX;
  return ARC_CY - Math.sqrt(Math.max(0, ARC_RADIUS ** 2 - dx ** 2));
}

const ARC_PATH = `M ${ARC.x0} ${ARC.chordY} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${ARC.x1} ${ARC.chordY}`;

/**
 * The box the gauge is drawn in. The SVG is pinned to its bottom, so where the
 * SVG starts is derived rather than written down: two literals would agree only
 * until one of them changed, and a few pixels of disagreement put the marker
 * off the curve.
 */
const BOX = 76;
const SVG_HEIGHT = 36;
const SVG_TOP = BOX - SVG_HEIGHT;

const DOT = 12;
const TAIL = 5;
const BADGE = 26;
const STROKE = 3;

/** Half a callout, the most it ever overhangs its marker's position. */
const BADGE_HALF = 24;

/**
 * How close, in percent of the scale, the marker may come to an end label
 * before that label steps aside: the callout rises right where the label
 * stands, and two numbers stacked on one spot read as neither.
 */
const LABEL_CLEARANCE = 14;

interface ProgressCurveProps {
  /** Where the marker sits, 0–100. Clamped rather than trusted. */
  percent: number;
  /** Sentence under the curve, naming both numbers the marker comes from. */
  caption: string;
  leftLabel?: string;
  rightLabel?: string;
  /**
   * Classes that cancel the parent card's side padding (`-mx-5 sm:-mx-6` in a
   * `Panel`), so the arc runs to the card's edges as the reference's does.
   */
  bleed?: string;
  className?: string;
}

/**
 * Tweens a 0-100 value towards its target, eased out over one sweep.
 *
 * The marker, the dot, the end labels and the printed number all read the
 * returned value, so they travel together instead of the number jumping while
 * the marker catches up. Starts from 0 so the gauge sweeps in on first paint,
 * and restarts each tween from the current position — a filter change mid-sweep
 * bends the marker rather than snapping it. Honors `prefers-reduced-motion` by
 * snapping straight to the target.
 */
function useAnimatedPercent(target: number): number {
  const [displayed, setDisplayed] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      fromRef.current = target;
      setDisplayed(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const durationMs = 650;
    const tick = (now: number) => {
      // Clamped on both sides: `now` is the frame's start time, which can sit a
      // few milliseconds *before* the `performance.now()` captured above (frame
      // clock skew). Unclamped, that negative elapsed time makes the eased value
      // dip below `from` — below 0 on the opening sweep — and a negative value
      // reaches the clip `rect`'s width, which SVG rejects outright.
      const t = Math.max(0, Math.min(1, (now - start) / durationMs));
      const eased = 1 - (1 - t) ** 3;
      const next = t >= 1 ? target : from + (target - from) * eased;
      fromRef.current = next;
      setDisplayed(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return displayed;
}

/**
 * The caption, with its figures lifted out of it.
 *
 * The reference prints « 560 kg / 1,000 kg » in white and « daily goal (56%) »
 * in grey: the numbers are what the eye looks for. Every run of digits (with
 * its separators and unit sign) is drawn in the foreground, the words stay
 * muted, and the sentence stays one string at the call site.
 */
function TwoToneCaption({ text }: { text: string }) {
  const parts = text.split(/(\d[\d\s\u202f.,]*\s?%?)/);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed split of one string
            key={index}
            className="text-foreground"
          >
            {part}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed split of one string
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function ProgressCurve({
  percent,
  caption,
  leftLabel = "0 %",
  rightLabel = "100 %",
  bleed,
  className,
}: ProgressCurveProps) {
  const target = Math.min(100, Math.max(0, percent));
  const animated = useAnimatedPercent(target);
  const rounded = Math.round(animated);
  // Unique per instance: several of these sit on one page, and a shared id
  // would paint the first gauge's gradient onto every arc on screen.
  const gradientId = useId();

  const markerX = scaleX(animated);
  // Where the curve is under the marker, in screen pixels. The dot and the
  // callout above it are placed relative to this one number.
  const curveY = SVG_TOP + arcYAt(markerX);
  // The labels stand a little above the arc at their own x.
  const labelTop = SVG_TOP + arcYAt(SCALE.from) - 20;

  return (
    <div className={cn("select-none", bleed, className)}>
      <div className="relative" style={{ height: BOX }}>
        <div
          className="pointer-events-none absolute inset-x-0 flex text-xs leading-none text-muted tabular-nums"
          style={{ top: labelTop }}
          aria-hidden="true"
        >
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap transition-opacity duration-200"
            style={{
              left: `${SCALE.from}%`,
              opacity: animated < LABEL_CLEARANCE ? 0 : 1,
            }}
          >
            {leftLabel}
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap transition-opacity duration-200"
            style={{
              left: `${SCALE.to}%`,
              opacity: animated > 100 - LABEL_CLEARANCE ? 0 : 1,
            }}
          >
            {rightLabel}
          </span>
        </div>

        <svg
          viewBox={`0 0 100 ${SVG_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 w-full"
          style={{ height: SVG_HEIGHT }}
          aria-hidden="true"
        >
          <defs>
            {/*
              Rose to cream to sage along the whole arc, transparent at both
              tips: the reference's arc has no hard ends, it fades into the
              card. The colours are the theme's muted status tones, so the
              scale stays inside the palette.
            */}
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--danger)" stopOpacity={0} />
              <stop offset="0.1" stopColor="var(--danger)" stopOpacity={0.9} />
              <stop offset="0.5" stopColor="var(--primary)" />
              <stop offset="0.9" stopColor="var(--success)" stopOpacity={0.9} />
              <stop offset="1" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={ARC_PATH}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div
          className="absolute -translate-x-1/2 rounded-full bg-foreground shadow-[0_1px_4px_rgb(0_0_0/0.4)]"
          style={{
            left: `${markerX}%`,
            top: curveY - DOT / 2,
            width: DOT,
            height: DOT,
          }}
          aria-hidden="true"
        />

        {/*
          A callout rather than a chip: the tail points at the dot, so the two
          read as one mark instead of a number hovering near a line. Built from
          borders rather than a rotated square, which would have to be aligned by
          hand and shows a seam where it meets the box.
        */}
        <div
          className="absolute -translate-x-1/2"
          style={{
            // Clamped: a callout centred on a marker near an edge would hang
            // half its width outside the card.
            left: `clamp(${BADGE_HALF}px, ${markerX}%, calc(100% - ${BADGE_HALF}px))`,
            top: curveY - DOT / 2 - TAIL - BADGE,
            height: BADGE,
          }}
        >
          <span className="relative flex h-full items-center rounded-control bg-foreground px-2.5 text-control leading-none font-medium text-background tabular-nums shadow-[0_2px_8px_rgb(0_0_0/0.35)] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-x-[5px] after:border-t-[5px] after:border-x-transparent after:border-t-foreground after:content-['']">
            {rounded} %
          </span>
        </div>
      </div>

      <p className="mt-1 text-center text-xs text-muted">
        <TwoToneCaption text={caption} />
      </p>
    </div>
  );
}
