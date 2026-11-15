import type { ReactNode } from "react";
import { Badge } from "@/components/atoms/badge";
import { StatFigure } from "@/components/molecules/stat-figure";

export interface RailVolumeFigure {
  label: string;
  value: ReactNode;
}

/**
 * A panel's large figure, with two supporting figures and a ratio badge,
 * shared by both rails. Which figure and which ratio are the caller's.
 */
export function RailVolume({
  leading,
  total,
  totalLabel,
  badge,
}: {
  /** The two supporting figures, read before the large one. */
  leading: [RailVolumeFigure, RailVolumeFigure];
  total: ReactNode;
  totalLabel: string;
  badge: ReactNode;
}) {
  return (
    <dl className="flex items-end justify-between gap-3">
      {/*
        The side columns don't shrink (a wrapped label misaligns its figure).
        `flex-col-reverse` keeps `dt` before `dd` in the DOM.
      */}
      <div className="flex shrink-0 flex-col gap-2.5 whitespace-nowrap">
        {leading.map((figure) => (
          <StatFigure
            key={figure.label}
            label={figure.label}
            value={figure.value}
          />
        ))}
      </div>

      <StatFigure align="center" size="lg" label={totalLabel} value={total} />

      <Badge tone="info" size="lg" className="shrink-0 self-end">
        {badge}
      </Badge>
    </dl>
  );
}
