import type { ReactNode } from "react";
import { SegmentedBar } from "@/components/atoms/segmented-bar";
import { cn } from "@/lib/cn";

export interface RailDistributionRow {
  /** React key — the category, not its label, which two can share. */
  key: string;
  /** An icon for the category. */
  mark: ReactNode;
  label: string;
  /** The full name, on the row's `title`. */
  title: string;
  count: ReactNode;
  /** 0–100, clamped by `SegmentedBar`. */
  percent: number;
  /** Whether this row is the active filter; only meaningful with `onSelect`. */
  active?: boolean;
  /** Makes the row a filter toggle (browse rail); absent where it is a report. */
  onSelect?: () => void;
}

/** A ranked list of categories: mark, name, count, bar, percentage. Shared by both rails. */
export function RailDistribution({ rows }: { rows: RailDistributionRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        // `min-w-0` so the bar is what gives way on a narrow row.
        const content = (
          <>
            {row.mark}
            <span className="w-[6.5rem] shrink-0 truncate text-sm text-foreground">
              {row.label}
            </span>
            <span className="w-5 shrink-0 text-right text-sm font-medium text-foreground tabular-nums">
              {row.count}
            </span>
            <SegmentedBar percent={row.percent} className="min-w-0" />
            <span className="w-9 shrink-0 text-right text-xs text-muted tabular-nums">
              {row.percent} %
            </span>
          </>
        );

        return (
          <li key={row.key} title={row.title}>
            {row.onSelect ? (
              <button
                type="button"
                onClick={row.onSelect}
                aria-pressed={row.active ?? false}
                className={cn(
                  // Negative margin + padding: same geometry, room for the tint.
                  "-mx-1.5 flex w-[calc(100%+0.75rem)] min-w-0 items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors",
                  "hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary",
                  row.active && "bg-primary/10",
                )}
              >
                {content}
              </button>
            ) : (
              <div className="flex min-w-0 items-center gap-2">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
