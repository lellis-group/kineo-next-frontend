import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** An inline action styled as a link, for filters and secondary commands. */
export function TextButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}
