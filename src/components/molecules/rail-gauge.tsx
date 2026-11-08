import type { ReactNode } from "react";
import { ProgressCurve } from "@/components/atoms/progress-curve";

/**
 * A rail panel's opening block: a grid of figures, then the arc that puts a
 * share of them in one glance.
 *
 * The two screens that carry a rail — the browse feed and the practice's own
 * board — each open with four numbers and an arc under them, and each had
 * written it out. They are the same panel: the reference's category card, drawn
 * twice. This is that card, so a change to one reaches the other.
 *
 * The cells are the caller's because which figures they are is the panel's
 * business — the browse feed states a collection, the board states the page in
 * front of the reader, and neither fact is this component's to know.
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

      {/*
        `mt-5`, not a gap on the panel: the space belongs above the arc only, so
        the arc still sits against the panel's own bottom padding.
      */}
      <div className="mt-5">
        <ProgressCurve percent={percent} caption={caption} />
      </div>
    </>
  );
}
