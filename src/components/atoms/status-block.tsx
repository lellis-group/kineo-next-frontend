import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/ui-tokens";

/** `Tone` plus the branded `primary`, for empty states. */
type StatusBlockTone = Tone | "primary";

const BADGE_TONE_CLASSES: Record<StatusBlockTone, string> = {
  primary: "bg-primary/10",
  neutral: "bg-surface-2",
  info: "bg-info/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
};

/**
 * A centred status message: icon, title, copy and an optional action, shared
 * by empty states and error screens. The action is a slot (atoms import no
 * other component).
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
  icon?: ReactNode;
  tone?: StatusBlockTone;
  title: string;
  description?: ReactNode;
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
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
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
