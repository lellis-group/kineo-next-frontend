import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * A boxed surface.
 *
 * `ComponentProps<"div">` and not a hand-written `{ className, children }`: the
 * atom is the one component every card in the product is built from, and the day
 * it refuses a `data-listing-id` or a `style` is the day its callers start
 * wrapping it in a div to get one. The two known consumers of those props — the
 * scroll-to-row lookup on the browse screen and the entrance stagger — are the
 * reason they are here.
 */
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card border border-border bg-surface", className)}
      {...rest}
    />
  );
}
