"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { UndoIcon } from "@/components/atoms/icons";
import { CountedTextarea } from "@/components/molecules/counted-textarea";
import { DangerPanel } from "@/components/molecules/danger-panel";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import { errorMessage } from "@/lib/api-errors";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";

export interface ApplicationWithdrawProps {
  onWithdraw: (reason: string) => Promise<void>;
  className?: string;
}

/** Backend WithdrawApplicationDto — optional reason, 1-500 chars. */
const MAX_REASON_LENGTH = 500;

/** Withdrawing is refused once the practice has answered: a state, not a fault. */
const WITHDRAW_COPY = {
  conflict:
    "Cette candidature ne peut plus être retirée dans son statut actuel.",
  unavailable: "Le retrait a échoué pour le moment. Veuillez réessayer.",
  "service-down":
    "Le service est hors service : le retrait n'a pas été enregistré. Réessayez dans quelques minutes.",
} as const;

export function ApplicationWithdraw({
  onWithdraw,
  className,
}: ApplicationWithdrawProps) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const {
    pending: submitting,
    error,
    run,
    clearError,
  } = useAsyncSubmit((err) => errorMessage(err, WITHDRAW_COPY));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(() => onWithdraw(reason));
  }

  return (
    <section aria-label="Retrait de la candidature" className={className}>
      <DangerPanel
        icon={<UndoIcon className="h-5 w-5" />}
        title="Retirer ma candidature"
        headingLevel="h2"
        className="p-6"
      >
        <p className="mt-0.5 text-sm text-muted">
          Votre candidature ne sera plus visible par le cabinet. Cette action
          est définitive.
        </p>

        {confirming ? (
          <form onSubmit={handleSubmit} className="mt-4">
            <CountedTextarea
              label="Motif du retrait (optionnel)"
              value={reason}
              onChange={setReason}
              maxLength={MAX_REASON_LENGTH}
              placeholder="Ex. : j'ai finalement trouvé un remplacement sur la même période…"
            />

            {error && (
              <InlineAlert as="p" tone="danger" className="mt-4">
                {error}
              </InlineAlert>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <PendingButton
                type="submit"
                variant="danger"
                pending={submitting}
                idleLabel="Confirmer le retrait"
                pendingLabel="Retrait en cours…"
              />
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => {
                  setConfirming(false);
                  clearError();
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setConfirming(true)}
          >
            Retirer ma candidature
          </Button>
        )}
      </DangerPanel>
    </section>
  );
}
