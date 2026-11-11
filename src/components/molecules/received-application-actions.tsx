"use client";

/**
 * The decision area of one application a practice received.
 *
 * Rendered under the card only while its status leaves the practice a choice:
 * a pending row carries everything, a shortlisted one keeps accept and reject,
 * and any decided row shows none — the card above already carries the answer.
 *
 * The state machine is card-local, on purpose: the error sentence must stand
 * next to the row it describes (a page-level banner over a dozen cards cannot
 * say which of them was busy), and nothing else needs to know. The parent re-
 * reads inside the awaited callback, so `pending` covers the write *and* the
 * re-read; `resolving` releases when both are done or one failed.
 */

import { type FormEvent, useState } from "react";
import { Button } from "@/components/atoms/button";
import { CountedTextarea } from "@/components/molecules/counted-textarea";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";
import type { ReceivedApplication } from "@/lib/listings";
import { applicationDecisionErrorMessage } from "@/lib/listings";

/** Backend RejectApplicationDto — optional reason, 1-500 chars. */
const MAX_REASON_LENGTH = 500;

/**
 * `idle` — buttons; `reject` — the optional-reason form, from « Refuser »;
 * `confirm` — the accept confirmation, held until the reader says so twice,
 * because this one decision changes lives beyond the row: the listing fills
 * and every other active candidate is refused for them.
 */
type DecisionStage = "idle" | "reject" | "confirm";

export interface ReceivedApplicationActionsProps {
  application: ReceivedApplication;
  onShortlist: () => Promise<void>;
  onAccept: () => Promise<void>;
  onReject: (reason: string | undefined) => Promise<void>;
  /** Mark-as-read, offered only on a candidate nobody has opened yet. */
  onMarkViewed: () => Promise<void>;
}

export function ReceivedApplicationActions({
  application,
  onShortlist,
  onAccept,
  onReject,
  onMarkViewed,
}: ReceivedApplicationActionsProps) {
  const [stage, setStage] = useState<DecisionStage>("idle");
  const [reason, setReason] = useState("");
  const { pending, error, run } = useAsyncSubmit(
    applicationDecisionErrorMessage,
  );

  async function settle(work: () => Promise<void>) {
    if (await run(work)) setStage("idle");
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = reason.trim();
    await settle(() => onReject(trimmed || undefined));
  }

  return (
    <div className="mt-7 border-t border-border pt-5">
      {error && (
        <InlineAlert as="p" tone="danger" className="mb-3">
          {error}
        </InlineAlert>
      )}

      {stage === "confirm" ? (
        <div>
          <p className="text-sm text-muted">
            L'annonce sera pourvue et les autres candidatures actives seront
            refusées pour vous.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <PendingButton
              pending={pending}
              disabled={pending}
              onClick={() => settle(() => onAccept())}
              idleLabel="Confirmer l'acceptation"
              pendingLabel="Acceptation…"
            />
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setStage("idle")}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : stage === "reject" ? (
        <form onSubmit={handleReject}>
          <CountedTextarea
            label="Motif communiqué au candidat (optionnel)"
            value={reason}
            onChange={setReason}
            maxLength={MAX_REASON_LENGTH}
            placeholder="Indiquez si vous le souhaitez la raison de votre refus…"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <PendingButton
              type="submit"
              pending={pending}
              idleLabel="Refuser cette candidature"
              pendingLabel="Refus…"
            />
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setStage("idle")}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {!application.viewed && (
            <PendingButton
              variant="ghost"
              pending={pending}
              disabled={pending}
              onClick={() => settle(() => onMarkViewed())}
              idleLabel="Marquer comme consultée"
              pendingLabel="Enregistrement…"
            />
          )}
          {application.status === "PENDING" && (
            <PendingButton
              variant="outline"
              pending={pending}
              disabled={pending}
              onClick={() => settle(() => onShortlist())}
              idleLabel="Présélectionner"
              pendingLabel="Présélection…"
            />
          )}
          {(application.status === "PENDING" ||
            application.status === "SHORTLISTED") && (
            <>
              <PendingButton
                variant="primary"
                pending={pending}
                disabled={pending}
                onClick={() => setStage("confirm")}
                idleLabel="Accepter"
                pendingLabel="Acceptation…"
              />
              <PendingButton
                variant="outline"
                pending={pending}
                disabled={pending}
                onClick={() => setStage("reject")}
                idleLabel="Refuser"
                pendingLabel="Refus…"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
