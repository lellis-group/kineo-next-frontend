import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BOARD_GRID, BOARD_MAIN, BOARD_RAIL, BOARD_SHELL } from "@/lib/layout";

/**
 * A console board: a summary rail on the left, the working area beside it.
 * Below `lg` the rail follows the content and the page scrolls normally.
 */
export function BoardShell({
  rail,
  children,
  className,
}: {
  rail: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(BOARD_SHELL, className)}>
      <div className={BOARD_GRID}>
        <div className={BOARD_RAIL}>{rail}</div>
        <div className={BOARD_MAIN}>{children}</div>
      </div>
    </div>
  );
}
