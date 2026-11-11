import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeTone } from "@/lib/ui-tokens";

/** Named sizes for the badge chip: `sm` is the original pill, the rest are
 * wider and squarer so a medium label has room to breathe. */
export type BadgeSize = "sm" | "md" | "lg";

/** Tones map to the global badge classes of `globals.css` — the site's
 * canonical badge look: a tinted chip with a tinted variant per tone. */
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "badge",
  success: "badge badge-success",
  warning: "badge badge-warning",
  danger: "badge badge-danger",
  info: "badge badge-info",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "",
  md: "px-2.5 py-1",
  lg: "px-3.5 py-1.5",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  variant = "boxed",
  className,
  children,
}: {
  tone?: BadgeTone;
  /** Same `sm` as before; `md` and `lg` are wider and squarer. */
  size?: BadgeSize;
  /**
   * `plain` drops the box and keeps the dot and the label: the status column
   * of a table, where the reference writes a status as text and a column of
   * framed chips would be the loudest thing on the screen.
   */
  variant?: "boxed" | "plain";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        TONE_CLASSES[tone],
        variant === "plain" ? "badge-plain" : SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
