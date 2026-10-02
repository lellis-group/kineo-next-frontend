import type { ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { InlineAlert } from "@/components/molecules/inline-alert";
import type { InlineAlertTone } from "@/lib/ui-tokens";

/**
 * A terminal auth screen: the outcome, and the one way out of it.
 *
 * Six of these across the auth and erasure flows — the email that was sent, the
 * reset link that expired, the password that is now active, the address that is
 * now verified — and all six were the same three things written out separately:
 * a `space-y-6` stack, a message, and a full-width primary button underneath.
 * Two of them were byte-identical apart from one word of copy and one tone.
 *
 * `children` sits between the message and the action, for the one thing that
 * needs to go there (the resend control on a failed verification). Kept as a slot
 * rather than a `showResend` boolean so this component keeps no knowledge of any
 * particular flow.
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
