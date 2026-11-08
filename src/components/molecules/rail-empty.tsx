import type { ReactNode } from "react";

/**
 * The "there is nothing here" line every panel of a rail falls back to.
 *
 * A molecule rather than a paragraph repeated at each call site: the five
 * occasions are five different sentences about five different panels, and what
 * they share is the shape, not the wording — which is exactly what a component
 * takes and what copy does not.
 *
 * The shape is the panel's own padding (`py-6`) around a centred, quiet line, so
 * an empty panel keeps the height a filled one has rather than collapsing to a
 * sentence at the top of a card.
 */
export function RailEmpty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}
