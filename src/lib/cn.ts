import { extendTailwindMerge } from "tailwind-merge";

/**
 * `tailwind-merge`, told about this theme's own tokens: otherwise `text-control`
 * reads as a colour and is dropped by `text-muted`. List each new `@theme`
 * utility here.
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
