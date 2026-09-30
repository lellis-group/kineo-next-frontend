import { cn } from "@/lib/cn";
import { PAGE_CONTAINER } from "@/lib/layout";

/**
 * Loading placeholder for the two collection screens (`/applications` and
 * `/listings/mine`).
 *
 * Both were writing this out separately, differing only in the card height, so
 * they drift on every later edit. It reproduces the real page rhythm — title,
 * subtitle, chips, cards at the `space-y-5` gap — so the swap when data lands
 * does not shift the layout under the reader.
 */
export function ListSkeleton({
  chipCount = 6,
  cardCount = 3,
  cardHeight = "h-36",
}: {
  chipCount?: number;
  cardCount?: number;
  /** Matches the collapsed card the real list will render. */
  cardHeight?: string;
}) {
  return (
    <div className={PAGE_CONTAINER}>
      <div className="h-9 w-64 animate-pulse rounded-control bg-surface" />
      <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-control bg-surface" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: chipCount }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            key={index}
            className="h-8 w-24 animate-pulse rounded-full bg-surface"
          />
        ))}
      </div>
      <div className="mt-8 space-y-5">
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
