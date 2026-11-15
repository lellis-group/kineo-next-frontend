import { Skeleton } from "@/components/atoms/skeleton";
import { BoardShell } from "@/components/templates/board-shell";

/** Streaming fallback for the member's home, on the same board geometry. */
export function DashboardSkeleton() {
  return (
    <BoardShell
      className="lg:py-4"
      rail={
        <div className="flex flex-col gap-3">
          <Skeleton shape="card" className="h-96" />
          <Skeleton shape="card" className="h-64" />
        </div>
      }
    >
      <Skeleton shape="card" className="h-44" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton shape="card" className="h-44" />
        <Skeleton shape="card" className="h-44" />
        <Skeleton shape="card" className="h-44 sm:col-span-2 xl:col-span-1" />
      </div>
      <Skeleton shape="card" className="h-72" />
    </BoardShell>
  );
}
