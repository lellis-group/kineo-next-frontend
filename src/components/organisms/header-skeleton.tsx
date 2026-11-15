import { KineoLogo } from "@/components/atoms/kineo-logo";
import { Skeleton } from "@/components/atoms/skeleton";
import { cn } from "@/lib/cn";
import { HEADER_BAR, HEADER_ROW, SITE_SHELL } from "@/lib/layout";

const NAV_WIDTHS = [64, 104, 56];

/** The header while the session resolves: same geometry as `SiteHeader`. */
export function HeaderSkeleton() {
  return (
    <header className={HEADER_BAR} aria-busy="true">
      <div className={cn(SITE_SHELL, HEADER_ROW)}>
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <KineoLogo />

          <div
            className="hidden items-center gap-1.5 xl:flex"
            aria-hidden="true"
          >
            {NAV_WIDTHS.map((width) => (
              <Skeleton
                key={width}
                shape="full"
                className="h-8"
                style={{ width }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3" aria-hidden="true">
          <Skeleton className="hidden h-10 w-10 sm:block" />
          <Skeleton shape="full" className="h-10 w-10" />
          <Skeleton shape="full" className="h-10 w-28" />
        </div>
      </div>
    </header>
  );
}
