/**
 * Visual vocabulary shared by the adapters (in `lib`) and the components, so
 * `lib` never imports from `components`. Each component keeps its own class
 * map; the sets below derive from `Tone` so the names can't diverge.
 */

/** The semantic tones, each mapped to a CSS color token (`--color-success`, …). */
export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/** Status chip: a neutral label whose dot takes the tone (`.badge-*` in `globals.css`). */
export type BadgeTone = Tone;

/** Every tone but `neutral`: a neutral alert would say nothing. */
export type InlineAlertTone = Exclude<Tone, "neutral">;

/** Button treatments, mapped to the variant classes on `Button`. */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

/** Button sizes: md for section actions, lg for primary auth actions. */
export type ButtonSize = "md" | "lg";
