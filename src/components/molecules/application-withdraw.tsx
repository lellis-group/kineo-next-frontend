"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { ArrowLeftIcon } from "@/components/atoms/icons";
import { DangerPanel } from "@/components/molecules/danger-panel";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import { errorMessage } from "@/lib/api-errors";
import { type ApplicationEntry, withdrawApplication } from "@/lib/applications";

export interface ApplicationWithdrawProps {
  application: ApplicationEntry;
  /** Called after a successful withdrawal — updated entry when the API echoes one, null to refetch. */
  onWithdrawn: (updated: ApplicationEntry | null) => void;
  className?: string;
}

/** Backend WithdrawApplicationDto — optional reason, 1-500 chars. */
const MAX_REASON_LENGTH = 500;

/**
 * Withdrawing is refused once the practice has answered, so the 400 is a state
 * the reader can act on (stop asking, accept the answer) rather than a fault.
 */
const WITHDRAW_COPY = {
  conflict:
    "Cette candidature ne peut plus être retirée dans son statut actuel.",
  unavailable: "Le retrait a échoué pour le moment. Veuillez réessayer.",
  "service-down":
    "Le service est hors service : le retrait n'a pas été enregistré. Réessayez dans quelques minutes.",
} as const;

export function ApplicationWithdraw({
  application,
  onWithdrawn,
  className,
}: ApplicationWithdrawProps) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const updated = await withdrawApplication(application.id, reason);
      onWithdrawn(updated);
    } catch (err) {
      setError(errorMessage(err, WITHDRAW_COPY));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-label="Retrait de la candidature" className={className}>
      <DangerPanel
        icon={<ArrowLeftIcon className="h-5 w-5" />}
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
            <label
              htmlFor="withdrawn-reason"
              className="flex items-baseline justify-between gap-4"
            >
              <span className="field-label">Motif du retrait (optionnel)</span>
              <span className="text-xs text-faint">
                {reason.length}/{MAX_REASON_LENGTH}
              </span>
            </label>
            <textarea
              id="withdrawn-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={MAX_REASON_LENGTH}
              placeholder="Ex. : j'ai finalement trouvé un remplacement sur la même période…"
              className="field-input mt-2 resize-none text-sm"
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
                  setError("");
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
