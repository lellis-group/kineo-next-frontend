import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type InlineAlertTone = "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<InlineAlertTone, string> = {
  info: "border-primary/30 bg-primary/10",
  success: "border-success/30 bg-success/10",
  warning: "border-warning/30 bg-warning/10",
  danger: "border-danger/25 bg-danger/10 text-danger",
};

/**
 * Layout per variant: `p` (compact, blocking) vs `output` (spacious, result).
 * Avoids utility class conflicts — `cn` resolves them predictably.
 */
const ELEMENT_CLASSES: Record<InlineAlertProps["as"] & string, string> = {
  p: "block px-3.5 py-2.5",
  output: "block px-4 py-3.5",
  div: "block px-4 py-3.5",
};

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  /**
   * `p` for a blocking error, announced immediately via `role="alert"` ·
   * `output` for a result worth reporting — the semantic element the project's
   * a11y lint expects for a polite status message.
   */
  as?: "p" | "output" | "div";
  className?: string;
  children: ReactNode;
}

/** Form inline message — consolidates styles previously duplicated across auth pages. */
export function InlineAlert({
  tone = "info",
  as: Component = "output",
  className,
  children,
}: InlineAlertProps) {
  return (
    <Component
      {...(Component === "p" ? { role: "alert" } : {})}
      className={cn(
        "rounded-lg border text-sm leading-relaxed",
        TONE_CLASSES[tone],
        ELEMENT_CLASSES[Component],
        className,
      )}
    >
      {children}
    </Component>
  );
}
