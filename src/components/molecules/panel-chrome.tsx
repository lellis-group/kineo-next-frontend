import type { ReactNode } from "react";
import { ExpandIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";

/**
 * The expand mark the reference puts in the corner of every card it draws.
 *
 * Decorative, and deliberately so. Its position is what makes a column of cards
 * read as the reference's column — the shape is part of the design — but there is
 * nothing on these screens for it to expand, so it is `aria-hidden` and out of
 * the tab order rather than a button that does nothing. A control that looks
 * live and is not the one thing a reader does not forgive in a control; the shape
 * is kept and the lie is not.
 */
export function PanelExpand() {
  return (
    <ExpandIcon className="size-4 shrink-0 text-faint" aria-hidden="true" />
  );
}

/**
 * One cell of a panel's 2×2 grid: an icon, the name of the figure and the figure.
 *
 * Shared by the two workspaces' first panel, which both draw the reference's chip
 * grid over their gauge. The value gets its own line rather than trailing the
 * label: in a column this wide, « Electronics 245kg » on one line leaves the
 * value stranded against the grid's gutter, while two lines let the label wrap
 * and let the figure be read at a size.
 *
 * A cell with `onClick` becomes a button, and a pressed one is drawn with the
 * same tint the active filters use elsewhere. The browse rail uses this to turn
 * its « Urgentes » figure into the filter it names — the number and the control
 * are the same fact, so they are the same element.
 */
export function StatChip({
  icon,
  label,
  value,
  onClick,
  pressed = false,
  title,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  /** Makes the cell a toggle. */
  onClick?: () => void;
  /** Whether the toggle is on. Ignored without `onClick`. */
  pressed?: boolean;
  /** The action in full, for a pointer that needs it. */
  title?: string;
}) {
  const content = (
    <>
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-2xs leading-tight text-muted">
          {label}
        </span>
        <span className="block truncate text-base leading-tight font-medium text-foreground tabular-nums">
          {value}
        </span>
      </span>
    </>
  );

  const classes = cn(
    "flex min-w-0 items-center gap-2 rounded-control px-3 py-2.5 text-left",
    pressed ? "bg-primary/15 ring-1 ring-primary/40" : "bg-white/[0.04]",
    onClick &&
      "cursor-pointer transition-colors hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  );

  if (!onClick) {
    return (
      <div className={classes} title={title}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={title}
      className={classes}
    >
      {content}
    </button>
  );
}
