/**
 * Visual vocabulary shared between the service layer and the components.
 *
 * These unions used to live on the components they name — `BadgeTone` on the
 * badge, `ButtonVariant` on the button — which forced `lib` to import from
 * `components` in order to type a status tone. That is the dependency running
 * backwards: the adapters decide what a status looks like, and the components
 * render it, so the vocabulary belongs below both.
 *
 * One vocabulary, several renderings. A chip, a bordered banner, a dot and an
 * alert are four different components with four different CSS treatments, so
 * each keeps its own class map — what must not happen is four different
 * *vocabularies*, where the same meaning gets a different name depending on
 * which component asked for it. That is why the sets below are derived from
 * `Tone` rather than written out: a tone added here is either renderable
 * everywhere or a compile error at every site that cannot honour it.
 */

/**
 * The semantic tones the product speaks in.
 *
 * Each maps to a CSS color token (`--color-success`, `--color-danger`, …).
 */
export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/** Tinted chip, mapped to the `.badge-*` classes in `globals.css`. */
export type BadgeTone = Tone;

/**
 * Alert tones: every tone except `neutral`, because a bordered alert is always
 * saying something — a neutral one would read as a panel and say nothing.
 */
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
