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
 * "Renvoyer l'email de vérification" with its three states.
 *
 * One block for /signup and /verify-email, down to the spinner classes, so a
 * wording change is made once and the success copy cannot drift.
 *
 * Deliberately says an email went out rather than that one exists: whether an
 * account is registered for the address is not something this screen can know.
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
