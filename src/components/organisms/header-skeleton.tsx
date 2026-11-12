import { KineoLogo } from "@/components/atoms/kineo-logo";
import { HEADER_HEIGHT, HEADER_HEIGHT_SM } from "@/lib/layout";

/**
 * The header while the session resolves: same geometry as `SiteHeader`, so a
 * member doesn't see the anonymous header flash first.
 */
export function HeaderSkeleton() {
  return (
    <header
      className="sticky top-0 z-40 bg-background/95 backdrop-blur"
      aria-busy="true"
    >
      <div
        className={`mx-auto flex ${HEADER_HEIGHT} w-full max-w-360 items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] ${HEADER_HEIGHT_SM} sm:gap-6 sm:px-8 lg:px-10`}
      >
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <KineoLogo />

          <div
            className="hidden items-center gap-1.5 xl:flex"
            aria-hidden="true"
          >
            {[64, 104, 56].map((width) => (
              <span
                key={width}
                className="h-8 animate-pulse rounded-full bg-surface"
                style={{ width }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3" aria-hidden="true">
          <span className="hidden h-10 w-10 animate-pulse rounded-control bg-surface sm:block" />
          <span className="h-10 w-10 animate-pulse rounded-full bg-surface" />
          <span className="h-10 w-28 animate-pulse rounded-full bg-surface" />
        </div>
      </div>
    </header>
  );
}
