import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/ui-tokens";

/**
 * The tint of the circular badge.
 *
 * `Tone` plus `primary`: an empty state is not a status the way an error is —
 * it is the branded "nothing here yet", painted in the product's primary rather
 * than in one of the semantic tones. Kept local to this atom rather than added
 * to the shared `Tone`, which is the status vocabulary and should not grow a
 * brand colour.
 */
type StatusBlockTone = Tone | "primary";

/**
 * Badge background per tone — this atom's own class map, the way `Badge` and
 * `InlineAlert` each keep theirs. What is shared is the vocabulary (`Tone`),
 * not the CSS treatment.
 */
const BADGE_TONE_CLASSES: Record<StatusBlockTone, string> = {
  primary: "bg-primary/10",
  neutral: "bg-surface-2",
  info: "bg-info/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
};

/**
 * A centred status message: a circular icon, a title, a line of copy, and an
 * optional action.
 *
 * The shape an empty state and an error screen have in common — "here is why
 * there is nothing to show, and what to do about it". It owns the arrangement
 * and the spacing; the caller owns the container (a `Card`, a full-height
 * screen) and the action.
 *
 * The action is a slot, not a rendered `Button`, and that is deliberate: an atom
 * imports no other component, so the caller passes the button it wants — a link
 * or a handler — and this stays a leaf. `SectionHeading`'s `action` is the same
 * call.
 */
export function StatusBlock({
  icon,
  tone = "primary",
  title,
  description,
  action,
  children,
  className,
}: {
  /** The glyph inside the circular badge. */
  icon?: ReactNode;
  /** Tint of the badge; defaults to the branded `primary`. */
  tone?: StatusBlockTone;
  title: string;
  description?: ReactNode;
  /** An action to offer — pass a `Button`. Rendered under the copy, spaced. */
  action?: ReactNode;
  /** Extra content between the copy and the action (a dev-only note, say). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {icon && (
        <div className={cn("mb-4 rounded-full p-4", BADGE_TONE_CLASSES[tone])}>
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      )}
      {children}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
