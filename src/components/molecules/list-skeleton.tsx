import { cn } from "@/lib/cn";
import { PAGE_CONTAINER } from "@/lib/layout";

interface ListSkeletonProps {
  chipCount?: number;
  cardCount?: number;
  cardHeight?: string;
  mapFirst?: boolean;
  /** The title + subtitle block; off for the browse feed, which has none. */
  titleBlock?: boolean;
  className?: string;
}

/**
 * Loading placeholder for the collection screens, matching the real page's
 * rhythm so nothing shifts when data lands. `mapFirst` is the browse feed's
 * shape, which opens on a map.
 */
export function ListSkeleton({
  chipCount,
  cardCount = 3,
  cardHeight = "h-36",
  mapFirst = false,
  titleBlock = true,
  className,
}: ListSkeletonProps) {
  const chips = chipCount ?? 0;

  return (
    <div className={cn(PAGE_CONTAINER, className)}>
      {titleBlock && (
        <>
          <div className="h-9 w-64 animate-pulse rounded-control bg-surface" />
          <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-control bg-surface" />
        </>
      )}

      {chips > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: chips }, (_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              key={index}
              className="h-8 w-24 animate-pulse rounded-full bg-surface"
            />
          ))}
        </div>
      )}

      {mapFirst && (
        <div className="mt-6 h-[22rem] animate-pulse rounded-card bg-map-base sm:h-[26rem]" />
      )}

      <div className={cn(mapFirst ? "mt-4" : "mt-8", "space-y-5")}>
        {Array.from({ length: cardCount }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={index}
            className={cn("animate-pulse rounded-card bg-surface", cardHeight)}
          />
        ))}
      </div>
    </div>
  );
}
