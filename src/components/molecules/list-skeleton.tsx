import { Skeleton } from "@/components/atoms/skeleton";
import { PAGE_CONTAINER } from "@/lib/layout";

const CARDS = [0, 1, 2];

/** Loading placeholder for a list screen, matching the real page's rhythm. */
export function ListSkeleton() {
  return (
    <div className={PAGE_CONTAINER}>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />

      <div className="mt-8 space-y-5">
        {CARDS.map((card) => (
          <Skeleton key={card} shape="card" className="h-36" />
        ))}
      </div>
    </div>
  );
}

/** The browse feed's shape: the map first, then its four rows. */
export function BrowseSkeleton() {
  return (
    <div className={PAGE_CONTAINER}>
      <Skeleton shape="card" className="h-[22rem] bg-map-base sm:h-[26rem]" />

      <div className="mt-4 space-y-5">
        {[0, 1, 2, 3].map((card) => (
          <Skeleton key={card} shape="card" className="h-36" />
        ))}
      </div>
    </div>
  );
}
