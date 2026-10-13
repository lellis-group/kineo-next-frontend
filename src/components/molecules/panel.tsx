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
  /**
   * Lets the panel fill a bounded height and hand the overflow to its body.
   *
   * The shell becomes `flex flex-col` and the body becomes the one flexible
   * region, so a child that scrolls (the results table) can take the height the
   * layout gives it instead of the panel growing to its content and pushing the
   * page. Responsive (`lg:`) on purpose: below `lg` the screen is ordinary
   * document flow, where nothing is bounded and `fill` would do nothing.
   */
  fill?: boolean;
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
      {/*
        Wraps rather than sits beside the title when there is no room: the action
        is usually a control wider than the heading, and a `justify-between` row
        would let it set the panel's min-content width and push the whole page
        sideways on a phone. `min-w-0` lets it shrink to its own overflow instead.

        `pb-4` rather than `pb-3`: the reference's card headers carry a full step
        more air under the title than this did, and the title is what the eye
        lands on first on a column of stacked cards.
      */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 pt-5 pb-4 sm:px-6">
        <h2 className="text-[0.9375rem] leading-tight font-medium text-foreground">
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
