import { Spinner } from "@/components/atoms/spinner";
import { cn } from "@/lib/cn";

export interface LoadingStateProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /**
   * Overrides the reserved height, for a route that fills the viewport
   * (`"min-h-dvh"` on the auth and erasure screens, which sit outside the site
   * layout).
   */
  className?: string;
}

/**
 * Centered page/section loader.
 *
 * The reserved height is this component's own business, not a shared token: the
 * error screen that sits beside it on the same routes wants a slightly taller
 * box, and the two had drifted to `50vh` and `60vh` respectively. Putting both
 * numbers in one place looked like a unification and was actually the opposite —
 * it silently moved four Suspense fallbacks by 10vh. Two components, two
 * intentions, two numbers.
 */
export function LoadingState({
  label = "Chargement",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 min-h-[50vh]",
        className,
      )}
    >
      <output aria-label={label}>
        <Spinner className="h-8 w-8 border-primary/20 border-t-primary" />
      </output>
    </div>
  );
}
