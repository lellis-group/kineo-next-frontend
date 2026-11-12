import { Spinner } from "@/components/atoms/spinner";
import { cn } from "@/lib/cn";

export interface LoadingStateProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  /** Overrides the reserved height (e.g. `"min-h-dvh"` outside the site layout). */
  className?: string;
}

/** Centred page/section loader. */
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
