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

  return (
    <div className={cn("select-none", className)}>
      <div className="relative pt-7">
        {/* The marker rides on top of the curve rather than inside it, so the
            percentage stays legible against whatever the curve passes under. */}
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${animated}%` }}
        >
          <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums">
            {rounded} %
          </span>
        </div>

        <div
          className="absolute top-[1.85rem] size-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background"
          style={{ left: `${animated}%` }}
          aria-hidden="true"
        />

        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="h-10 w-full"
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
                into whatever slice of the curve the clip is currently revealing. */}
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="100"
              y2="0"
            >
              <stop offset="0%" stopColor="var(--danger)" />
              <stop offset="50%" stopColor="var(--warning)" />
              <stop offset="100%" stopColor="var(--success)" />
            </linearGradient>
          </defs>
          {/* A symmetric circular arc (R 102 puts the apex at y 12 for a 96-wide
              chord at y 24): the old quadratic peaked left of centre, which put
              the high point — and the marker above it at 50% — off the middle
              of the scale. */}
          <path
            d="M 2 24 A 102 102 0 0 1 98 24"
            fill="none"
            stroke="var(--muted)"
            strokeOpacity={0.45}
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 2 24 A 102 102 0 0 1 98 24"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            clipPath={`url(#${clipId})`}
          />
        </svg>

        <div className="mt-1.5 flex justify-between text-[0.6875rem] text-faint tabular-nums">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted">{caption}</p>
    </div>
  );
}
