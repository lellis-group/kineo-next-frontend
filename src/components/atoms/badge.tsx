import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BadgeTone } from "@/lib/ui-tokens";

export type BadgeSize = "sm" | "md" | "lg";

/** Tones map to the `.badge-*` classes of `globals.css`. */
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
  /** `plain` drops the box and keeps the dot and the label (table status column). */
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
