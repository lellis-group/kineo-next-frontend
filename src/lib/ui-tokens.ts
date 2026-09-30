/**
 * Visual vocabulary shared between the service layer and the components.
 *
 * These unions used to live on the components they name — `BadgeTone` on the
 * badge, `ButtonVariant` on the button — which forced `lib` to import from
 * `components` in order to type a status tone. That is the dependency running
 * backwards: the adapters decide what a status looks like, and the components
 * render it, so the vocabulary belongs below both.
 *
 * The components re-export these, so `import { BadgeTone } from
 * "@/components/atoms/badge"` keeps working for anything that reads it there.
 */

/** Tinted chip, mapped to the `.badge-*` classes in `globals.css`. */
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

/** Button treatments, mapped to the variant classes on `Button`. */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

/** Button sizes: md for section actions, lg for primary auth actions. */
export type ButtonSize = "md" | "lg";
