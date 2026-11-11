import { CapacityBar } from "@/components/molecules/capacity-bar";
import { formatDayMonth } from "@/lib/format";

/**
 * The cells the two listing tables draw the same way.
 *
 * The browse table and the practice's board share a shape — an icon column,
 * a two-stop period, a capacity bar — and the cells below are why they cannot
 * drift apart: the alignment contract (`--cell-icon`, the first line every
 * column's text starts on) and the route reading of a date range are written
 * once, here, and both tables inherit them.
 *
 * Each renders what goes *inside* a cell, not the `<td>` itself: the tables own
 * their cells, so every column stays visible in the table's own markup, and a
 * cell can never end up nested in another.
 */

/**
 * The period as the reference draws a route: two stops, one above the other,
 * a hollow dot for the start and a filled one for the end, joined by a rule.
 * The dots say « from … to » without the arrow or the words.
 *
 * Two lines of one height keep every row the same height: a range worded out
 * was the one column whose text wrapped and made its row the tall one.
 *
 * The dots are placed in `rem` from the line height every cell shares
 * (`--cell-icon`, 1.25rem): a 0.45rem dot centred on a line sits 0.4rem from
 * its top, and the rule fills the 0.8rem between the two dots.
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
    <span
      className="inline-flex gap-[var(--cell-gap)] whitespace-nowrap text-foreground"
      title={dateRange}
    >
      <span
        className="flex flex-col items-center pt-[0.4rem]"
        aria-hidden="true"
      >
        <span className="size-[0.45rem] rounded-full border border-muted" />
        <span className="h-[0.8rem] w-px bg-border-strong" />
        <span className="size-[0.45rem] rounded-full bg-muted" />
      </span>
      <span className="flex flex-col leading-[var(--cell-icon)]">
        <span>{formatDayMonth(startDate)}</span>
        <span>{formatDayMonth(endDate)}</span>
      </span>
    </span>
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
  return <CapacityBar count={count} max={max} />;
}
