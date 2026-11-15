import { Skeleton } from "@/components/atoms/skeleton";
import { BOARD_GRID, BOARD_MAIN, BOARD_SHELL } from "@/lib/layout";

const RAIL_CARDS = ["h-[19rem]", "h-[15rem]", "h-[17rem]"];
const ROWS = [0, 1, 2, 3, 4];

/** The practice board while its first read is in flight. */
export function MyListingsSkeleton() {
  return (
    <div className={BOARD_SHELL}>
      <div className={BOARD_GRID}>
        <div className="hidden flex-col gap-3 lg:flex" aria-hidden="true">
          {RAIL_CARDS.map((height) => (
            <Skeleton key={height} shape="card" className={height} />
          ))}
        </div>

        <div className={BOARD_MAIN} aria-hidden="true">
          <div className="flex min-h-0 flex-1 flex-col rounded-card border border-border bg-surface">
            <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
              <Skeleton shape="full" className="h-5 w-28 bg-surface-2" />
              <div className="flex items-center gap-2">
                <Skeleton shape="full" className="h-8 w-24 bg-surface-2" />
                <Skeleton shape="full" className="h-8 w-32 bg-surface-2" />
              </div>
            </div>

            <div className="space-y-4 px-6 pb-6">
              {ROWS.map((row) => (
                <Skeleton key={row} className="h-14 bg-surface-2/60" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
