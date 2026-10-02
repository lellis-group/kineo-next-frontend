import { PAGE_CONTAINER } from "@/lib/layout";

/**
 * Streaming fallback for the member dashboard.
 *
 * The home page resolves the session, then streams the dashboard behind this.
 * It reproduces the real grid — greeting, three stat cards, activity feed,
 * sidebar — so the swap when data lands does not shift the layout.
 */
export function DashboardSkeleton() {
  return (
    <div className={PAGE_CONTAINER}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="h-28 animate-pulse rounded-control bg-surface" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-32 animate-pulse rounded-control bg-surface" />
            <div className="h-32 animate-pulse rounded-control bg-surface" />
            <div className="h-32 animate-pulse rounded-control bg-surface" />
          </div>
          <div className="h-64 animate-pulse rounded-control bg-surface" />
        </div>
        <aside className="h-96 animate-pulse rounded-control bg-surface" />
      </div>
    </div>
  );
}
