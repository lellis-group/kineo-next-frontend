import { cn } from "@/lib/cn";

/**
 * A track with a filled portion drawn as a row of ticks.
 *
 * An atom: twenty spans of its own, composing no other component.
 *
 * The ticks are the point: a continuous fill would make two bars of 84% and 60%
 * differ by a sliver nobody can judge at a glance, while ticks are countable and
 * two rows are directly comparable to each other. The count is fixed rather than
 * derived from the percentage, so a 3% row is not a bar with one lonely tick and
 * a 97% row is not a solid block — every row shows the same number of marks, and
 * the fill is read by how far the marks reach.
 *
 * `percent` is clamped because it reaches this from a division the caller did:
 * a rounding artefact above 100 would overflow the track, and a negative value
 * would render inside out.
 */
interface SegmentedBarProps {
  /** Share of the row, 0–100. Clamped rather than trusted. */
  percent: number;
  className?: string;
}

export function SegmentedBar({ percent, className }: SegmentedBarProps) {
  const filled = Math.min(100, Math.max(0, percent));

  return (
    <div
      // Decorative: the number it draws is always printed next to it.
      aria-hidden="true"
      className={cn(
        "flex h-4 min-w-0 flex-1 items-center gap-[2px] overflow-hidden",
        className,
      )}
    >
      {Array.from({ length: 20 }, (_, index) => {
        const on = (index + 0.5) / 20 <= filled / 100;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative ticks
            key={index}
            className={cn(
              "h-2.5 w-[2px] shrink-0 rounded-full transition-colors",
              on ? "bg-primary" : "bg-border-strong",
            )}
          />
        );
      })}
    </div>
  );
}
