import { Skeleton } from "@/components/atoms/skeleton";
import { PAGE_CONTAINER } from "@/lib/layout";

/** Streaming fallback for the member dashboard, matching its grid. */
export function DashboardSkeleton() {
  return (
    <div className={PAGE_CONTAINER}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Skeleton className="h-28" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
        <aside>
          <Skeleton className="h-96" />
        </aside>
      </div>
    </div>
  );
}
