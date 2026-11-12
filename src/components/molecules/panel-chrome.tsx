import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";

/** The decorative ↗ in a panel's corner; `aria-hidden`, since it expands nothing. */
export function PanelExpand() {
  return (
    <ArrowUpRightIcon
      className="size-4 shrink-0 text-muted"
      strokeWidth={1.5}
      aria-hidden="true"
    />
  );
}

/**
 * One cell of a panel's 2×2 grid: icon, label, figure. With `onClick` it
 * becomes a toggle (e.g. the browse rail's « Urgentes » filter).
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
  onClick?: () => void;
  /** Ignored without `onClick`. */
  pressed?: boolean;
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
