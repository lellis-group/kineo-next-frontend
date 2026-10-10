import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SOFT_PANEL, SOFT_PANEL_BODY } from "@/lib/layout";

/**
 * A recessed box for a message that belongs to the flow, not to the chrome.
 *
 * The lighter of the two: `EmptyState` is a page's answer — icon, title, a call
 * to action — and `Card` is a real surface. This is the sentence a card says
 * about itself when there is nothing to show yet: no applications on a posting,
 * nothing in the selected category. Three of those were written out by hand with
 * the same border, the same background and the same centring.
 *
 * ## One element, not a wrapper around a wrapper
 *
 * `as="p"` exists because two of the three call sites were paragraphs, and they
 * should stay paragraphs — a one-sentence notice is prose, and a screen reader
 * announcing it as a generic group is slightly worse. The first version wrapped
 * the body in an inner `div`, which quietly turned both into `<div><div>`; that is
 * also why there is no inner wrapper here, since nesting one inside a `p` is not
 * valid HTML.
 *
 * A panel whose content is more than a sentence passes its own element per
 * paragraph and puts any extra layout on `className`.
 */
export function SoftPanel({
  children,
  as: Component = "div",
  className,
}: {
  children: ReactNode;
  /** `"p"` for a single sentence of prose, `"div"` when it holds more than one. */
  as?: "div" | "p";
  /** Extra layout on the box, merged over the default padding and centring. */
  className?: string;
}) {
  return (
    <Component className={cn(SOFT_PANEL, SOFT_PANEL_BODY, className)}>
      {children}
    </Component>
  );
}
