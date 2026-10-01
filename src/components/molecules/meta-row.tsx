import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

/** Tone of the leading dot, for the read/unread state of an application. */
export type MetaDotTone = "success" | "muted" | "danger";

const DOT_TONES: Record<MetaDotTone, string> = {
  success: "bg-success",
  muted: "bg-muted",
  danger: "bg-danger",
};

/**
 * The row's own box: icon size, gap, text size, line wrapping.
 *
 * Everything on the product that shows "where, when, how many" goes through
 * here, which is what makes two cards written by different people look like they
 * belong to the same screen. The rhythm used to be retyped at every call site —
 * `h-4` next to `text-sm` on one card, `h-3.5` next to `text-[13px]` on the
 * next — so the same calendar icon was drawn at two sizes between a card and the
 * detail page it links to, and nothing lined up.
 */
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
        "flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted sm:text-sm",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * One fact in a meta row: an icon, a status dot, or plain text.
 *
 * The icon is taken as a *component* rather than as a rendered node on purpose.
 * A node lets each call site pass its own size class, which is exactly how the
 * icons drifted apart; handing over the component keeps the size in one place.
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
        // A truncating item has to be allowed to shrink below its content, and
        // the others must not be — otherwise the long one refuses to shrink and
        // pushes the row onto two lines instead of truncating.
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
