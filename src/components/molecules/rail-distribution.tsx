import type { ReactNode } from "react";
import { SegmentedBar } from "@/components/atoms/segmented-bar";
import { cn } from "@/lib/cn";

export interface RailDistributionRow {
  /** React key — the category, not its label, which two categories can share. */
  key: string;
  /**
   * The mark that opens the row: an icon for the category.
   *
   * The caller's, because it is the one thing that tells a reader which panel
   * this row belongs to — a specialty here, a status there — and the two sets of
   * marks share no vocabulary.
   */
  mark: ReactNode;
  /** What is counted, as the narrow column can carry it. */
  label: string;
  /** The full name, on the row's `title`. */
  title: string;
  count: ReactNode;
  /** The row's share, 0–100. Clamped by `SegmentedBar` itself. */
  percent: number;
  /**
   * Whether this row's category is the one currently filtered on.
   *
   * Only meaningful with `onSelect`: a row without a handler is a figure, not a
   * control, and says nothing about what is applied.
   */
  active?: boolean;
  /**
   * Makes the row a toggle for its category.
   *
   * Present on the browse rail, where the specialty bars are also the specialty
   * filter. Absent on the practice board, whose distribution is a report.
   */
  onSelect?: () => void;
}

/**
 * A ranked list of categories: mark, name, count, bar, percentage.
 *
 * The panel both rails are built around — the reference's distribution card,
 * written once so the two rails cannot drift apart. The `title` sits on the
 * `<li>` — over the whole row rather than over the truncated word, which is
 * where a reader reaches for it anyway.
 *
 * A molecule: it composes the atom `SegmentedBar` and nothing else, and it
 * carries no wording — the caller owns the labels, because what a row is named
 * is the panel's business and not this row's.
 */
export function RailDistribution({ rows }: { rows: RailDistributionRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        /*
          `min-w-0` on the row so the bar — the only elastic child — is the one
          that gives way. With fixed widths on the label and the counters, an
          overflowing row pushes them out of the panel instead of shrinking the
          bar, and the percentages end up printed over the page background.
        */
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
                  // The negative margin and matching padding keep the row's
                  // geometry identical to a plain one while giving the hover and
                  // pressed tints an edge to sit against.
                  "-mx-1.5 flex w-[calc(100%+0.75rem)] min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors",
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
