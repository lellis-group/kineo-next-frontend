import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

/** Tone of the leading dot, for the read/unread state of an application. */
export type MetaDotTone = "success" | "muted" | "danger";

const DOT_TONES: Record<MetaDotTone, string> = {
  success: "bg-success",
  muted: "bg-muted",
  danger: "bg-danger",
};

/** The shared "where, when, how many" row, so every card uses one rhythm. */
export function MetaRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-control text-muted sm:text-sm",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * One fact in a meta row: an icon, a status dot, or plain text. The icon is a
 * component, so its size stays defined here.
 */
export function MetaRowItem({
  icon: Icon,
  dot,
  truncate = false,
  emphasis = false,
  className,
  children,
}: {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  dot?: MetaDotTone;
  /** Clamps the text to one line with an ellipsis. */
  truncate?: boolean;
  /** Overrides the muted ink — for a value the reader must actually read. */
  emphasis?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5",
        // Only the truncating item may shrink below its content.
        truncate && "min-w-0 flex-1",
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONES[dot])}
        />
      )}

      {Icon && <Icon className="h-4 w-4 shrink-0 text-faint" />}

      <span
        className={cn(
          "min-w-0 break-words",
          truncate && "truncate",
          emphasis && "font-medium text-foreground",
        )}
      >
        {children}
      </span>
    </span>
  );
}
