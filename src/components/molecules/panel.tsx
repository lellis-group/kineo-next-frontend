import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  title: string;
  children: ReactNode;
  /** Trailing control in the header — a link, a toggle. */
  action?: ReactNode;
  className?: string;
  /** Removes the body padding, for a panel whose content bleeds to the edge. */
  flush?: boolean;
}

/**
 * A titled box — the shell the browse screen's three summary panels and its
 * results panel are built from.
 *
 * Not `PageHeader`: that is a page's own `h1` and it sits on the page's own
 * rhythm, where nothing is boxed. A panel is a box with a title in its top-left
 * corner and a small control in its top-right, repeated three times down a
 * column and once across the width — the repetition is the point, and it is what
 * makes the column read as one surface rather than as three unrelated widgets.
 */
export function Panel({
  title,
  children,
  action,
  className,
  flush = false,
}: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface",
        "shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {/*
        Wraps rather than sits beside the title when there is no room: the action
        is usually a control wider than the heading, and a `justify-between` row
        would let it set the panel's min-content width and push the whole page
        sideways on a phone. `min-w-0` lets it shrink to its own overflow instead.
      */}
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pt-4 pb-3 sm:px-5">
        <h2 className="text-[0.9375rem] leading-tight font-medium text-foreground">
          {title}
        </h2>
        {action ? <div className="min-w-0">{action}</div> : null}
      </header>
      <div className={cn(flush ? undefined : "px-4 pb-4 sm:px-5 sm:pb-5")}>
        {children}
      </div>
    </section>
  );
}
