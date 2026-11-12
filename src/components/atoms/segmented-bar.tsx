import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * A track whose filled portion is drawn as countable ticks (`.tick-track` in
 * `globals.css`), filling whatever width the row leaves.
 */
interface SegmentedBarProps {
  /** 0–100; clamped. */
  percent: number;
  className?: string;
}

export function SegmentedBar({ percent, className }: SegmentedBarProps) {
  const filled = Math.min(100, Math.max(0, percent));

  return (
    <div
      // The number is always printed next to it.
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
