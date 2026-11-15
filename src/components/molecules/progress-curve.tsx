"use client";

import { Fragment, useId } from "react";
import { cn } from "@/lib/cn";
import { useAnimatedPercent } from "@/lib/hooks/use-animated-percent";
import {
  ARC_PATH,
  arcYAt,
  BADGE,
  BADGE_HALF,
  BOX,
  DOT,
  LABEL_CLEARANCE,
  SCALE,
  STROKE,
  SVG_HEIGHT,
  SVG_TOP,
  scaleX,
  splitCaption,
  TAIL,
} from "@/lib/progress-curve";

/**
 * A 0→100 scale drawn as a gradient arc with a marker on it, and a required
 * caption saying what the percentage is of.
 */
export interface ProgressCurveProps {
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

/** The caption, with its figures drawn in the foreground and words muted. */
function TwoToneCaption({ text }: { text: string }) {
  return (
    <>
      {splitCaption(text).map((part, index) =>
        part.figure ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed split of one string
            key={index}
            className="text-foreground"
          >
            {part.text}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed split of one string
          <Fragment key={index}>{part.text}</Fragment>
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
