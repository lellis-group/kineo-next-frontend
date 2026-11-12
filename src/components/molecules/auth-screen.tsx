import type { ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { InlineAlert } from "@/components/molecules/inline-alert";
import type { InlineAlertTone } from "@/lib/ui-tokens";

/**
 * A terminal auth screen: the message, an optional slot (e.g. a resend
 * control), and one full-width way out.
 */
export function AuthScreen({
  tone = "info",
  message,
  actionLabel,
  actionHref,
  onAction,
  children,
}: {
  /** Message tone — see `InlineAlertTone`. */
  tone?: InlineAlertTone;
  message: ReactNode;
  actionLabel: string;
  /** Rendered as a link when given, as a click handler otherwise. */
  actionHref?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <InlineAlert tone={tone}>{message}</InlineAlert>

      {children}

      {actionHref ? (
        <Button href={actionHref} size="lg" className="w-full">
          {actionLabel}
        </Button>
      ) : (
        <Button onClick={onAction} size="lg" className="w-full">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
