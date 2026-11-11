import type { ReactNode } from "react";
import { Badge } from "@/components/atoms/badge";

export interface RailVolumeFigure {
  /** The name of the figure. */
  label: string;
  /** The figure. */
  value: ReactNode;
}

/**
 * The figure a panel is about, with the two numbers it is read against.
 *
 * The reference's cost card: two small figures at the left, one large one in the
 * middle, a badge at the right. Both rails drew it — the browse feed's volume of
 * postings, the board's volume published — and each wrote out the `<dl>` and its
 * four `<dt>`/`<dd>` pairs separately.
 *
 * A molecule: it composes the atom `Badge` and holds no wording. Which figure is
 * the large one, and which ratio belongs in the badge, are the two things the
 * panels actually disagree about — the browse feed's share is urgent postings out
 * of the collection, the board's is filled ones — so both are props rather than
 * assumptions.
 *
 * The badge goes through the `Badge` atom rather than the raw `.badge` classes.
 * The two are the same strings either way; this is the one that keeps a third
 * panel from reaching past the token.
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
  /** What the large figure counts. */
  totalLabel: string;
  /** The ratio, stated — the only figure here that is a ratio of two others. */
  badge: ReactNode;
}) {
  return (
    <dl className="flex items-end justify-between gap-3">
      {/*
        Figure over its label on the sides, label over the figure in the
        middle, as the reference lays out its own three-column card. The side
        columns do not shrink: wrapped, « En cours » broke onto two lines and
        pushed its figure out of line with the one beside it.

        `flex-col-reverse` keeps `dt` before `dd` in the document, which a
        description list requires, while the figure reads first.
      */}
      <div className="flex shrink-0 flex-col gap-2.5 whitespace-nowrap">
        {leading.map((figure) => (
          <div key={figure.label} className="flex flex-col-reverse">
            <dt className="text-2xs leading-tight text-muted">
              {figure.label}
            </dt>
            <dd className="text-base leading-tight font-medium text-foreground tabular-nums">
              {figure.value}
            </dd>
          </div>
        ))}
      </div>
      <div className="min-w-0 text-center">
        <dt className="text-2xs leading-tight text-muted">{totalLabel}</dt>
        <dd className="mt-1.5 text-4xl leading-none text-foreground tabular-nums">
          {total}
        </dd>
      </div>
      <Badge tone="info" size="lg" className="shrink-0 self-end">
        {badge}
      </Badge>
    </dl>
  );
}
