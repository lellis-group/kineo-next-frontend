import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { InlineAlertTone } from "@/lib/ui-tokens";

const TONE_CLASSES: Record<InlineAlertTone, string> = {
  info: "border-info/30 bg-info/10",
  success: "border-success/30 bg-success/10",
  warning: "border-warning/30 bg-warning/10",
  danger: "border-danger/25 bg-danger/10 text-danger",
};

/** Layout per element: `p` (compact, blocking) vs `output` (spacious, result). */
const ELEMENT_CLASSES: Record<InlineAlertProps["as"] & string, string> = {
  p: "block px-3.5 py-2.5",
  output: "block px-4 py-3.5",
  div: "block px-4 py-3.5",
};

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  /** `p` for a blocking error (`role="alert"`), `output` for a polite status. */
  as?: "p" | "output" | "div";
  className?: string;
  children: ReactNode;
}

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
        "rounded-control border text-sm leading-relaxed",
        TONE_CLASSES[tone],
        ELEMENT_CLASSES[Component],
        className,
      )}
    >
      {children}
    </Component>
  );
}
