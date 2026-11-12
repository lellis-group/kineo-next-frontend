import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The sizes a chip is drawn at: the default (filter rows), `md` (beside other
 * toolbar controls), `sm` (inside a popover), `block` (full-width in a popover).
 */
export type ChipSize = "default" | "sm" | "md" | "block";

const SIZE_CLASSES: Record<ChipSize, string> = {
  default: "",
  sm: "chip-sm",
  md: "chip-md",
  block: "chip-block",
};

/**
 * A chip: a toggle for an option that is a *state*, not an action (unlike
 * `Button`). Its surface lives in `globals.css` (`.chip`).
 */
export function Chip({
  size = "default",
  active,
  className,
  children,
  ...button
}: ComponentProps<"button"> & {
  size?: ChipSize;
  /** Lights the chip when it carries no `aria-pressed` (e.g. « Filtres »). */
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "chip",
        SIZE_CLASSES[size],
        active && "is-active",
        className,
      )}
      {...button}
    >
      {children}
    </button>
  );
}
