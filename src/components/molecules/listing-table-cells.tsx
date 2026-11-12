import { CapacityBar } from "@/components/molecules/capacity-bar";
import { formatDayMonth } from "@/lib/format";

/**
 * Cell contents (not the `<td>`) the two listing tables draw the same way, so
 * their alignment (`--cell-icon`) can't drift apart.
 */

/**
 * The period as a route: two stops (hollow start, filled end) joined by a
 * rule, one line each. Dot offsets are in `rem` from `--cell-icon` (1.25rem).
 * `title` carries the full `dateRange`.
 */
export function ListingPeriodCell({
  dateRange,
  startDate,
  endDate,
}: {
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

/** Candidates: count, range and `CapacityBar`; no bar without a cap. */
export function ListingCandidatesCell({
  count,
  max,
}: {
  count: number;
  max?: number;
}) {
  return <CapacityBar count={count} max={max} />;
}
