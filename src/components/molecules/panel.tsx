import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Removes the body padding, for a panel whose content bleeds to the edge. */
  flush?: boolean;
  /**
   * From `lg`, fills a bounded height and hands the overflow to its body (e.g.
   * the results table).
   */
  fill?: boolean;
}

/** A titled box with an optional control in its top-right corner. */
export function Panel({
  title,
  children,
  action,
  className,
  flush = false,
  fill = false,
}: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-card border border-border bg-surface",
        "shadow-[var(--shadow-card)]",
        fill && "lg:flex lg:min-h-0 lg:flex-col",
        className,
      )}
    >
      {/* Wraps when there is no room, so a wide action can't push the page sideways. */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-4 sm:px-6">
        <h2 className="text-lg leading-tight font-medium text-foreground">
          {title}
        </h2>
        {action ? (
          <div className="flex min-w-0 items-center gap-2">{action}</div>
        ) : null}
      </header>
      <div
        className={cn(
          flush ? undefined : "px-5 pb-5 sm:px-6",
          fill && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col",
        )}
      >
        {children}
      </div>
    </section>
  );
}
