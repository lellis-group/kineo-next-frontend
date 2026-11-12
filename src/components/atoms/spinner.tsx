import { cn } from "@/lib/cn";

export interface SpinnerProps {
  /** Size + colors (e.g. "h-4 w-4 border-primary/20 border-t-primary"). */
  className?: string;
}

/** Circular loading indicator; size and colours come from the caller. */
export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2",
        className,
      )}
    />
  );
}
