"use client";

import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import type { ResendStatus } from "@/lib/hooks/use-resend-verification";

export interface ResendVerificationProps {
  /** State from `useResendVerification`. */
  status: ResendStatus;
  onResend: () => void;
  /** Shown once the resend succeeds. */
  sentMessage: string;
}

/**
 * "Renvoyer l'email de vérification" with its three states. Says an email
 * went out, never whether the account exists.
 */
export function ResendVerification({
  status,
  onResend,
  sentMessage,
}: ResendVerificationProps) {
  if (status === "sent") {
    return <InlineAlert tone="info">{sentMessage}</InlineAlert>;
  }

  return (
    <>
      <PendingButton
        onClick={onResend}
        pending={status === "sending"}
        size="lg"
        className="w-full"
        idleLabel="Renvoyer l'email de vérification"
        pendingLabel="Envoi en cours…"
      />

      {status === "error" && (
        <InlineAlert as="p" tone="danger">
          L&apos;envoi a échoué. Vérifiez votre connexion, puis réessayez.
        </InlineAlert>
      )}
    </>
  );
}
