import { extendTailwindMerge } from "tailwind-merge";

/**
 * `tailwind-merge`, told about this theme's own scale.
 *
 * It only knows Tailwind's default names, so a class built on a token from
 * `globals.css` is guessed at: `text-control` reads as a text *colour* and is
 * dropped as soon as a real colour follows it (`text-control text-muted` came
 * out as `text-muted`, and every 13px control rendered at the inherited size).
 * Each token added to `@theme` with a utility of its own is listed here.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs", "control"],
      radius: ["control", "card"],
    },
  },
});

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
