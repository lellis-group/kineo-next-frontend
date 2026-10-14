import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The sizes a chip is drawn at.
 *
 * Three besides the default, because three are drawn. The default is the tall
 * control the console's filter rows use; `md` is the same chip beside another
 * control on a toolbar, shorter but still tall enough to press; `sm` drops the
 * floor entirely for a chip inside a popover, where the neighbours already
 * provide the row; and `block` is the one standing alone in that popover, which
 * has a row to itself and the room to be comfortable in.
 *
 * A size rather than padding at each call site: these overrides were the same
 * numbers written three times over, and a fourth chip would have written them
 * again. `block` carries `width: 100%` for the same reason — a chip that claims
 * the popover's whole row is a different chip, not a layout tweak the caller
 * should keep remembering.
 */
export type ChipSize = "default" | "sm" | "md" | "block";

const SIZE_CLASSES: Record<ChipSize, string> = {
  default: "",
  sm: "chip-sm",
  md: "chip-md",
  block: "chip-block",
};

/**
 * A chip: the console's own control for a row of options that are all still true
 * at once — the specialty filters, « Urgentes », « Filtres ».
 *
 * Not a `Button`. A button is an action and this is a *state*: `.chip` carries
 * `aria-pressed` styling (`:hover`, `[aria-pressed="true"]`, `.is-active`) that
 * reads as one control with a lit segment, and folding it into the button
 * variants would mean either duplicating those states or losing them.
 *
 * What it does share with `Button` is the arrangement: both keep their surface
 * in `globals.css` and expose only the parts that change — the tones there, the
 * two sizes here — so the class list at every call site stays short enough to
 * read. That is the whole reason this file exists; the button underneath is one
 * element with one class.
 */
export function Chip({
  size = "default",
  active,
  className,
  children,
  ...button
}: ComponentProps<"button"> & {
  /** Omitted from the class list entirely when it is the default. */
  size?: ChipSize;
  /**
   * Marks the chip lit.
   *
   * `.chip` already answers to `[aria-pressed="true"]`, so a chip that is
   * pressed does not need this; it is here for the ones that carry no
   * `aria-pressed` — « Filtres », which is `aria-expanded` — so the lit state is
   * one prop whatever the role the chip happens to play.
   */
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
