import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SOFT_PANEL, SOFT_PANEL_BODY } from "@/lib/layout";

/**
 * A recessed box for a one-line message inside a card ("nothing here yet").
 * Lighter than `EmptyState`. `as="p"` keeps a single sentence a paragraph.
 */
export function SoftPanel({
  children,
  as: Component = "div",
  className,
}: {
  children: ReactNode;
  as?: "div" | "p";
  className?: string;
}) {
  return (
    <Component className={cn(SOFT_PANEL, SOFT_PANEL_BODY, className)}>
      {children}
    </Component>
  );
}
