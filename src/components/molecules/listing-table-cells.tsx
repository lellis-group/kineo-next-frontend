import { CalendarIcon } from "@/components/atoms/icons";
import { CapacityBar } from "@/components/molecules/capacity-bar";
import { formatDayMonth } from "@/lib/format";

/**
 * The cells the two listing tables draw the same way.
 *
 * The browse table and the practice's board share a shape — an icon column,
 * a two-line period, a capacity bar — and the cells below are why they cannot
 * drift apart: the alignment contract (`--cell-icon`, the first line every
 * column's text starts on) and the route reading of a date range are written
 * once, here, and both tables inherit them.
 */

/**
 * The period as two lines, which is how the reference draws a route: a start
 * above, an end below, the arrow doing what « Du … au … » had to do with words —
 * and with less of them.
 *
 * It matters for the same reason it matters in both tables: the cell next to it
 * is a single line, and a range worded out is the one column whose text wraps to
 * three lines and makes the row the tall one. Two lines keep every row the same
 * height.
 *
 * `title` carries the full `dateRange` the adapter built, year and all, for the
 * reader who wants the exact wording.
 */
export function ListingPeriodCell({
  dateRange,
  startDate,
  endDate,
}: {
  /** The adapter's full wording, kept for the hover. */
  dateRange?: string;
  startDate: string;
  endDate: string;
}) {
  return (
    <td>
      <span
        className="inline-flex items-start gap-[var(--cell-gap)] whitespace-nowrap text-muted"
        title={dateRange}
      >
        <CalendarIcon className="mt-[0.125rem] size-[var(--cell-icon)] shrink-0" />
        <span className="flex flex-col">
          <span className="leading-[var(--cell-icon)]">
            {formatDayMonth(startDate)}
          </span>
          <span className="text-xs leading-tight text-faint">
            → {formatDayMonth(endDate)}
          </span>
        </span>
      </span>
    </td>
  );
}

/**
 * Candidats, au trait de la maquette : le chiffre, la plage, et la barre qui les
 * lit d'un coup d'œil (voir `CapacityBar`). Sans plafond, la barre n'existe pas.
 */
export function ListingCandidatesCell({
  count,
  max,
}: {
  count: number;
  max?: number;
}) {
  return (
    <td>
      <CapacityBar count={count} max={max} />
    </td>
  );
}
