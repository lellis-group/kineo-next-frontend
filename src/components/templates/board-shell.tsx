import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BOARD_GRID, BOARD_MAIN, BOARD_RAIL, BOARD_SHELL } from "@/lib/layout";

/**
 * A console board: a summary rail on the left, the working area beside it.
 * Below `lg` the rail follows the content and the page scrolls normally,
 * unless `railFirst` keeps it on top (a rail that introduces the page).
 */
export function BoardShell({
  rail,
  children,
  railFirst = false,
  className,
}: {
  rail: ReactNode;
  children: ReactNode;
  railFirst?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(BOARD_SHELL, className)}>
      <div className={BOARD_GRID}>
        <div className={cn(BOARD_RAIL, railFirst && "order-1")}>{rail}</div>
        <div className={cn(BOARD_MAIN, railFirst && "order-2")}>{children}</div>
      </div>
    </div>
  );
}
