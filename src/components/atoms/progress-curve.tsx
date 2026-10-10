import { useId } from "react";
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
 * The curve is stroked once, in `--primary`, over a muted track, rather than in
 * the multi-colour gradient a status scale would use. A gradient here would
 * imply thresholds — red is bad, green is good — that mean nothing for "how many
 * of these are urgent"; red is exactly the number the panel is asking about.
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

export function ProgressCurve({
  percent,
  caption,
  leftLabel = "0 %",
  rightLabel = "100 %",
  className,
}: ProgressCurveProps) {
  const value = Math.min(100, Math.max(0, percent));
  const rounded = Math.round(value);
  // Unique per instance: several of these sit on one page, and a shared clipPath
  // id would have the first panel's width applied to every curve on the screen.
  const clipId = useId();

  return (
    <div className={cn("select-none", className)}>
      <div className="relative pt-7">
        {/* The marker rides on top of the curve rather than inside it, so the
            percentage stays legible against whatever the curve passes under. */}
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${value}%` }}
        >
          <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums">
            {rounded} %
          </span>
        </div>

        <div
          className="absolute top-[1.85rem] size-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background"
          style={{ left: `${value}%` }}
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
              <rect x="0" y="0" width={value} height="40" />
            </clipPath>
          </defs>
          <path
            d="M 0 34 Q 50 0 100 14"
            fill="none"
            stroke="var(--muted)"
            strokeOpacity={0.45}
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 0 34 Q 50 0 100 14"
            fill="none"
            stroke="var(--primary)"
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
