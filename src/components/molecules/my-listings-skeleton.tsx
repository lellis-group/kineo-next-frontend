import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";

/**
 * The board while its first read is in flight.
 *
 * Reproduces the workspace's geometry rather than a generic list's: rail and card
 * side by side, filling the height the real page will fill. A placeholder of the
 * wrong shape would show a stacked list where a two-column workspace lands, and
 * every panel would move at the moment the reader starts reading.
 *
 * Pulsing blocks rather than `ListSkeleton`'s card rhythm: this screen has no
 * cards, and a skeleton shaped like the thing it is about to be replaced by is
 * the kind that does not shift.
 */
export function MyListingsSkeleton() {
  return (
    <div
      className={cn(SITE_SHELL, "flex flex-col lg:h-full lg:min-h-0 lg:flex-1")}
    >
      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-3 lg:flex">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className={cn(
                "animate-pulse rounded-card border border-border bg-surface",
                // Three different heights, because the three panels are three
                // different heights and one block of each would put them where
                // they will not be.
                row === 0 && "h-[19rem]",
                row === 1 && "h-[15rem]",
                row === 2 && "h-[17rem]",
              )}
            />
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
            <div className="h-5 w-28 animate-pulse rounded-full bg-surface-2" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 animate-pulse rounded-full bg-surface-2" />
              <div className="h-8 w-32 animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>

          <div className="space-y-4 px-6 pb-6">
            {[0, 1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-14 animate-pulse rounded-xl bg-surface-2/60"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
