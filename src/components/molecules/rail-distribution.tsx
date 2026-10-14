import type { ReactNode } from "react";
import { SegmentedBar } from "@/components/atoms/segmented-bar";

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
}

/**
 * A ranked list of categories: mark, name, count, bar, percentage.
 *
 * The panel both rails are built around — the reference's distribution card. It
 * was written out twice, once per rail, and the two copies had begun to differ:
 * one put the full name on the row, the other on the label, so the same tooltip
 * appeared over two different widths. This is the one row, and the `title` sits
 * on the `<li>` — over the whole row rather than over the truncated word, which
 * is where a reader reaches for it anyway.
 *
 * A molecule: it composes the atom `SegmentedBar` and nothing else, and it
 * carries no wording — the caller owns the labels, because what a row is named
 * is the panel's business and not this row's.
 */
export function RailDistribution({ rows }: { rows: RailDistributionRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        // `min-w-0` on the row so the bar — the only elastic child — is the one
        // that gives way. With fixed widths on the label and the counters, an
        // overflowing row pushes them out of the panel instead of shrinking the
        // bar, and the percentages end up printed over the page background.
        <li
          key={row.key}
          className="flex min-w-0 items-center gap-2"
          title={row.title}
        >
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
        </li>
      ))}
    </ul>
  );
}
