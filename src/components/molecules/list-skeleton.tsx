import { cn } from "@/lib/cn";
import { PAGE_CONTAINER } from "@/lib/layout";

interface ListSkeletonProps {
  /** Filter chips above the list, omitted on screens whose filters live elsewhere. */
  chipCount?: number;
  cardCount?: number;
  /** Matches the collapsed card the real list will render. */
  cardHeight?: string;
  /** Pages whose layout is not the console list: the browse feed leads with a map. */
  mapFirst?: boolean;
  className?: string;
}

/**
 * Loading placeholder for the collection screens (`/applications`,
 * `/listings/mine` and the `/listings` feed).
 *
 * Those were writing this out separately, differing only in the card height, so
 * they drift on every later edit. It reproduces the real page rhythm — title,
 * subtitle, chips, cards at the `space-y-5` gap — so the swap when data lands
 * does not shift the layout under the reader.
 *
 * `mapFirst` is the browse feed's variant. It is not cosmetic: that page opens on
 * a fixed-height map with the filters floating over it, so a placeholder of the
 * wrong shape would show a chip row where a map lands and then push every card
 * down by the height of the map — the layout would jump at exactly the moment the
 * reader starts reading.
 */
export function ListSkeleton({
  chipCount,
  cardCount = 3,
  cardHeight = "h-36",
  mapFirst = false,
  className,
}: ListSkeletonProps) {
  const chips = chipCount ?? 0;

  return (
    <div className={cn(PAGE_CONTAINER, className)}>
      <div className="h-9 w-64 animate-pulse rounded-control bg-surface" />
      <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-control bg-surface" />

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
        <div className="mt-6 h-[22rem] animate-pulse rounded-2xl bg-surface sm:h-[26rem]" />
      )}

      <div className={cn(mapFirst ? "mt-4" : "mt-8", "space-y-5")}>
        {Array.from({ length: cardCount }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={index}
            className={cn("animate-pulse rounded-2xl bg-surface", cardHeight)}
          />
        ))}
      </div>
    </div>
  );
}
