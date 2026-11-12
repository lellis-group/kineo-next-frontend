import type { ReactNode } from "react";
import { ProgressCurve } from "@/components/atoms/progress-curve";

/**
 * A rail panel's opening block: a grid of figures (the caller's), then the arc
 * showing a share of them. Shared by both rails.
 */
export function RailGauge({
  percent,
  caption,
  children,
}: {
  /** The arc's share, 0–100. Clamped by `ProgressCurve` itself. */
  percent: number;
  /** What the percentage is *of* — required, because the arc states a ratio. */
  caption: string;
  /** The grid's cells — four `StatChip` on both screens. */
  children: ReactNode;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">{children}</div>

      <div className="mt-2">
        <ProgressCurve
          percent={percent}
          caption={caption}
          bleed="-mx-5 sm:-mx-6"
        />
      </div>
    </>
  );
}
