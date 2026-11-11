import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * A track with a filled portion drawn as a row of ticks.
 *
 * The ticks are the point: a continuous fill would make two bars of 84% and 60%
 * differ by a sliver nobody can judge at a glance, while ticks are countable and
 * two rows are directly comparable to each other.
 *
 * The ticks are a repeating gradient (`.tick-track` in `globals.css`), not a
 * fixed number of spans, so the track fills whatever width the row leaves it.
 * A fixed count overflowed narrow rows and was clipped: twenty ticks in a
 * 49px rail showed about twelve, and a 35% row lit seven of them, so it read
 * as more than half. The filled layer is a width in percent of the real track,
 * rounded down to a whole tick so the last one is never cut in half.
 *
 * `percent` is clamped because it reaches this from a division the caller did:
 * a rounding artefact above 100 would overflow the track, and a negative value
 * would render inside out.
 */
interface SegmentedBarProps {
  /** Share of the row, 0–100. Clamped rather than trusted. */
  percent: number;
  className?: string;
}

export function SegmentedBar({ percent, className }: SegmentedBarProps) {
  const filled = Math.min(100, Math.max(0, percent));

  return (
    <div
      // Decorative: the number it draws is always printed next to it.
      aria-hidden="true"
      className={cn("relative h-3 min-w-0 flex-1", className)}
    >
      <span className="tick-track absolute inset-0 text-border-strong" />
      <span
        className="tick-track tick-fill absolute inset-y-0 left-0 text-primary"
        style={{ "--fill": `${filled}%` } as CSSProperties}
      />
    </div>
  );
}
