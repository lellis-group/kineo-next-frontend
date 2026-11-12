import { Fragment, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A 0→100 scale drawn as a gradient arc with a marker on it, and a required
 * caption saying what the percentage is of.
 */

/**
 * The arc, in viewBox units: the SVG is `preserveAspectRatio="none"` over a
 * 100-wide viewBox, so x is a percentage of the width and y is a pixel.
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

/** Where 0 % and 100 % sit: inboard of the arc's ends, which fade out. */
const SCALE = { from: 8, to: 92 } as const;

function scaleX(percent: number): number {
  return SCALE.from + (SCALE.to - SCALE.from) * (percent / 100);
}

/** Where the curve is at a given x, in viewBox units, so the marker rides it. */
function arcYAt(x: number): number {
  const dx = x - ARC_CX;
  return ARC_CY - Math.sqrt(Math.max(0, ARC_RADIUS ** 2 - dx ** 2));
}

const ARC_PATH = `M ${ARC.x0} ${ARC.chordY} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${ARC.x1} ${ARC.chordY}`;

/** The box the gauge is drawn in; the SVG is pinned to its bottom. */
const BOX = 76;
const SVG_HEIGHT = 36;
const SVG_TOP = BOX - SVG_HEIGHT;

const DOT = 12;
const TAIL = 5;
const BADGE = 26;
const STROKE = 3;

/** Half a callout, the most it ever overhangs its marker's position. */
const BADGE_HALF = 24;

/** How close the marker may come to an end label before the label hides. */
const LABEL_CLEARANCE = 14;

interface ProgressCurveProps {
  /** 0–100; clamped. */
  percent: number;
  /** Sentence under the curve, naming both numbers the marker comes from. */
  caption: string;
  leftLabel?: string;
  rightLabel?: string;
  /** Classes that cancel the parent card's side padding, so the arc bleeds. */
  bleed?: string;
  className?: string;
}

/**
 * Tweens a 0-100 value towards its target, eased out. Starts at the target so
 * the server render shows the right number; honors `prefers-reduced-motion`.
 */
function useAnimatedPercent(target: number): number {
  const [displayed, setDisplayed] = useState(target);
  const fromRef = useRef(target);
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
      // Clamped: a frame's `now` can predate `start`, and a negative value
      // would reach the clip rect's width, which SVG rejects.
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

/** The caption, with its figures drawn in the foreground and words muted. */
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
  // Unique per instance, or every arc would paint the first gradient.
  const gradientId = useId();

  const markerX = scaleX(animated);
  const curveY = SVG_TOP + arcYAt(markerX);
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

        <div
          className="absolute -translate-x-1/2"
          style={{
            // Clamped so a callout near an edge stays inside the card.
            left: `clamp(${BADGE_HALF}px, ${markerX}%, calc(100% - ${BADGE_HALF}px))`,
            top: curveY - DOT / 2 - TAIL - BADGE,
            height: BADGE,
          }}
        >
          <span className="relative flex h-full items-center rounded-control bg-foreground px-2.5 whitespace-nowrap text-control leading-none font-medium text-background tabular-nums shadow-[0_2px_8px_rgb(0_0_0/0.35)] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-x-[5px] after:border-t-[5px] after:border-x-transparent after:border-t-foreground after:content-['']">
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
