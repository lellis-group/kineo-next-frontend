import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A 0→100 scale with a marker on it, and a caption naming what it counts.
 *
 * An atom: it composes no other component — the track, the fill and the marker
 * are its own `<svg>` and `<div>`s. It earns its place next to `Button` and
 * `Badge` because it is one indivisible thing the reader sees, not a section
 * built out of smaller parts.
 *
 * The caption is not decoration and the component takes it as a required prop:
 * a marker sitting on a curve with no sentence under it is a number the reader
 * has to guess the meaning of, and the obvious guess — progress towards some goal
 * — is wrong for most of the things this is used for. So the caller states what
 * the percentage is of, and the marker is drawn at the position that sentence
 * describes.
 *
 * The curve is stroked in a left-to-right scale gradient — `--danger` through
 * `--warning` to `--success`, the way the template’s own progress arc reads —
 * over a muted track. The gradient is positional, not semantic: it spans the
 * whole scale whatever the value is, and the marker plus the caption say where
 * on it the collection sits. Painting the fill fixed (rather than tinting it by
 * the current value) means a small move of the number does not re-dye the
 * whole curve. The sweep itself is tweened (see `useAnimatedPercent`): one
 * eased value drives marker, dot, fill and number, and reduced-motion readers
 * snap straight to the number.
 */

/**
 * The arc, in the units it is drawn in.
 *
 * A viewBox 100x40 rendered at 40px tall means one y unit is one pixel, so the
 * geometry below is read in screen pixels directly and no scaling factor
 * appears anywhere in the component.
 *
 * The radius is the bow, and the reference gauge's bow is small: measured off the
 * mock, its curve lifts about 2.4% of its own width, which reads as almost a
 * straight line. R 102 — where this started — lifts 12.5%, five times that, so it
 * was the "obvious arc" rather than the template. R 200 lands at 6%: visibly
 * curved, and a small multiple of the reference. Exact fidelity would be R 500,
 * at which point the curve stops curving and the marker has nothing to ride.
 */
const ARC = {
  x0: 2,
  x1: 98,
  /** Where the chord sits; the arc bows above it. */
  chordY: 24,
  radius: 200,
} as const;

/** The circle's centre: below the chord, so the arc bows upward. */
const ARC_CX = (ARC.x0 + ARC.x1) / 2;
const ARC_CY =
  ARC.chordY + Math.sqrt(ARC.radius ** 2 - ((ARC.x1 - ARC.x0) / 2) ** 2);

/**
 * Where the curve is at a given percent, in viewBox units.
 *
 * The marker rides this instead of sitting at a fixed height, which is what the
 * template does and what the previous version did not: pinned to one `top`, the
 * dot happened to touch the curve near the middle and floated 16px above it at
 * both ends — the ends being where a value first gets read.
 */
function arcYAt(percent: number): number {
  const x = ARC.x0 + (ARC.x1 - ARC.x0) * (percent / 100);
  const dx = x - ARC_CX;
  return ARC_CY - Math.sqrt(Math.max(0, ARC.radius ** 2 - dx ** 2));
}

/**
 * The SVG is pinned to the bottom of the box, so where it starts is whatever the
 * box leaves over — which is why this is derived rather than written down.
 *
 * It was a literal once, and the box was styled `h-16` in the markup: the two
 * agreed only until one of them changed. They disagreed by 4px, which put the
 * marker off the curve and left 1px between the line and the end labels — the two
 * looking like one.
 */
const BOX = 68;
const SVG_HEIGHT = 40;
const SVG_TOP = BOX - SVG_HEIGHT;

const DOT = 10;
const TAIL = 5;
const BADGE = 23;

/** Half a badge, the most the callout ever overhangs its marker's position. */
const BADGE_HALF = 26;

interface ProgressCurveProps {
  /** Where the marker sits, 0–100. Clamped rather than trusted. */
  percent: number;
  /** Sentence under the curve, naming both numbers the marker comes from. */
  caption: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

/**
 * Tweens a 0-100 value towards its target, eased out over one sweep.
 *
 * The marker, the dot, the clipped fill and the printed number all read the
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
      const t = Math.min(1, (now - start) / durationMs);
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

export function ProgressCurve({
  percent,
  caption,
  leftLabel = "0 %",
  rightLabel = "100 %",
  className,
}: ProgressCurveProps) {
  const target = Math.min(100, Math.max(0, percent));
  const animated = useAnimatedPercent(target);
  const rounded = Math.round(animated);
  // Unique per instance: several of these sit on one page, and shared ids would
  // have the first panel's width and gradient painted onto every curve on screen.
  const clipId = useId();
  const gradientId = useId();

  // Where the curve is under the marker, in screen pixels. Everything else — the
  // dot, and the badge above it — is placed relative to this one number.
  const curveY = SVG_TOP + arcYAt(animated);

  return (
    <div className={cn("select-none", className)}>
      <div className="relative" style={{ height: BOX }}>
        {/*
          A callout rather than a chip: the tail points at the dot, so the two read
          as one mark instead of a number hovering near a line. Built from borders
          rather than a rotated square, which would have to be aligned by hand and
          shows a seam where it meets the pill.
        */}
        <div
          className="absolute -translate-x-1/2"
          style={{
            // Clamped: a callout centred on a marker at 0% or 100% would hang
            // half its width outside the component. The tail then points a few
            // pixels inboard of the mark, which is the lesser of the two.
            left: `clamp(${BADGE_HALF}px, ${animated}%, calc(100% - ${BADGE_HALF}px))`,
            top: curveY - DOT / 2 - TAIL - BADGE,
          }}
        >
          <span className="relative block rounded-md bg-primary px-1.5 py-0.5 text-[0.6875rem] leading-tight font-semibold text-primary-foreground tabular-nums after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-x-4 after:border-t-[5px] after:border-x-transparent after:border-t-primary after:content-['']">
            {rounded} %
          </span>
        </div>

        <div
          className="absolute -translate-x-1/2 rounded-full bg-primary"
          style={{
            left: `${animated}%`,
            top: curveY - DOT / 2,
            width: DOT,
            height: DOT,
          }}
          aria-hidden="true"
        />

        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-10 w-full"
          aria-hidden="true"
        >
          <defs>
            {/* Clipping by x rather than stroking the path up to a fraction of its
                length: on a curve the two are not the same thing, and the marker
                above is positioned by x. A dash-offset fill would stop short of
                the dot, or run past it, depending on the shape. */}
            <clipPath id={clipId}>
              <rect x="0" y="0" width={animated} height="40" />
            </clipPath>
            {/* Positional, not value-driven: pinned to x in user space, red always
                means "few" and green always "most", whatever the marker says. An
                object-bounding-box gradient would squeeze the same three stops
                into whatever slice of the curve the clip is currently revealing.

                The middle stop is the brand cream rather than the amber: that is
                the reference gauge's own gradient — red into cream into green. */}
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="100"
              y2="0"
            >
              <stop offset="0%" stopColor="var(--danger)" />
              <stop offset="45%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--success)" />
            </linearGradient>
          </defs>
          {/* A symmetric circular arc (R 102 puts the apex at y 12 for a 96-wide
              chord at y 24): the old quadratic peaked left of centre, which put
              the high point — and the marker above it at 50% — off the middle
              of the scale. */}
          <path
            d={`M ${ARC.x0} ${ARC.chordY} A ${ARC.radius} ${ARC.radius} 0 0 1 ${ARC.x1} ${ARC.chordY}`}
            fill="none"
            stroke="var(--muted)"
            strokeOpacity={0.4}
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M ${ARC.x0} ${ARC.chordY} A ${ARC.radius} ${ARC.radius} 0 0 1 ${ARC.x1} ${ARC.chordY}`}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${clipId})`}
          />
        </svg>

        {/*
          The end labels sit *under* the curve rather than level with its ends,
          which is where the reference puts them.

          Level with the ends is the reference's arrangement too, and it was this
          one's first attempt — but the callout travels down to the chord as the
          marker reaches 0% or 100%, and there it sat straight through the label.
          Both readings are exact, so one of them has to give.

          `+ 4` rather than a rounder number: the stroke is 2px with round caps,
          so it reaches one unit past the chord, and anything less than this puts
          the line back through the text.
        */}
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-between text-[0.6875rem] leading-none text-faint tabular-nums"
          style={{ top: SVG_TOP + ARC.chordY + 4 }}
        >
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted">{caption}</p>
    </div>
  );
}
