import { KineoLogo } from "@/components/atoms/kineo-logo";

/**
 * Placeholder for the header while the server resolves the session.
 *
 * It exists because the obvious fallback — the anonymous header — is a lie
 * for a signed-in member: the page would paint "Se connecter / Créer un
 * compte" and then swap the whole bar a moment later. This reserves the same
 * geometry as `SiteHeader` (same heights, logo, one slot per side) so nothing
 * moves when the real state arrives.
 *
 * Bar-shaped, not a spinner: the header is a horizontal strip, and a circular
 * loader there would resize the bar.
 */
export function HeaderSkeleton() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur"
      aria-busy="true"
    >
      <div className="mx-auto flex h-16 w-full max-w-360 items-center justify-between gap-2 px-4 sm:h-19 sm:gap-6 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <KineoLogo />

          <div
            className="hidden items-center gap-1.5 lg:flex"
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
          <span className="hidden h-10 w-10 animate-pulse rounded-lg bg-surface sm:block" />
          <span className="h-10 w-10 animate-pulse rounded-full bg-surface" />
          <span className="h-10 w-28 animate-pulse rounded-full bg-surface" />
        </div>
      </div>
    </header>
  );
}
