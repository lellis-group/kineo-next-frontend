"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { CloseIcon } from "@/components/atoms/icons";
import { DangerPanel } from "@/components/molecules/danger-panel";
import { PendingButton } from "@/components/molecules/pending-button";
import { plural } from "@/lib/format";

/** The two actions that take a listing out of circulation. */
export type ListingAction = "close" | "cancel";

export interface ListingActionsProps {
  /** Active candidates (PENDING / SHORTLISTED) currently on the listing. */
  activeCount: number;
  /** True while the request is in flight. */
  acting?: boolean;
  onClose: () => void;
  onCancel: () => void;
}

const ACTION_COPY: Record<
  ListingAction,
  { title: string; confirm: string; intro: string }
> = {
  close: {
    title: "Clôturer l'annonce",
    confirm: "Clôturer",
    intro:
      "L'annonce ne recevra plus de candidature. Les candidats qui n'ont pas encore répondu verront leur candidature passer en refus, avec la mention qu'aucun remplaçant n'a été retenu.",
  },
  cancel: {
    title: "Annuler l'annonce",
    confirm: "Annuler l'annonce",
    intro:
      "L'annonce disparaît de la plateforme sans qu'un remplacement ait été trouvé. Les candidats en attente verront leur candidature passer en refus.",
  },
};

/**
 * Terminal actions on a listing, behind an explicit confirmation.
 *
 * The step is here because the consequence is not on the listing: both actions
 * terminate every active application server-side, and the backend records that
 * as a REJECTION with a machine-written reason. A candidate who was still
 * waiting is therefore told they were refused — not "the listing closed" — and
 * that cannot be undone from this screen.
 *
 * No notification is sent: the only thing the candidate receives is the status
 * change on their own screen. The copy says « verront leur candidature passer en
 * refus » because that is exactly what happens, rather than promising an email
 * that does not exist.
 *
 * The confirmation states that consequence with the live count, so the
 * decision is taken with the actual number in front of them rather than a
 * generic warning.
 *
 * With no active candidate there is nobody to notify, so the step is skipped
 * entirely: a confirmation that protects nothing is friction.
 */
export function ListingActions({
  activeCount,
  acting,
  onClose,
  onCancel,
}: ListingActionsProps) {
  const [pending, setPending] = useState<ListingAction | null>(null);

  // With nobody waiting there is no consequence to warn about.
  const needsConfirm = activeCount > 0;

  // One trigger row, used whether or not a confirmation follows: the buttons
  // must not move or change label when a step is added.
  const triggers = (
    <>
      <PendingButton
        variant="outline"
        pending={acting === true}
        onClick={() => (needsConfirm ? setPending("close") : onClose())}
        idleLabel="Clôturer l'annonce"
      />{" "}
      <Button
        variant="ghost"
        onClick={() => (needsConfirm ? setPending("cancel") : onCancel())}
        disabled={acting}
        className="mt-3 text-danger hover:bg-danger/10 sm:ml-3 sm:mt-0"
      >
        Annuler l&apos;annonce
      </Button>
    </>
  );

  // Two ways to reach the same place — nobody waiting, or a confirmation is not
  // open — and both show the triggers.
  if (!needsConfirm || !pending) {
    return <div>{triggers}</div>;
  }

  const copy = ACTION_COPY[pending];

  return (
    <DangerPanel title={copy.title}>
      <p className="mt-0.5 text-sm leading-relaxed text-muted">{copy.intro}</p>

      <p className="mt-4 text-sm font-medium text-foreground">
        {activeCount} candidature{plural(activeCount)} en cours{" "}
        {activeCount > 1 ? "seront terminées" : "sera terminée"}.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <PendingButton
          variant="danger"
          pending={acting === true}
          onClick={pending === "close" ? onClose : onCancel}
          idleLabel={`Confirmer : ${copy.confirm.toLowerCase()}`}
        />
        <Button
          variant="ghost"
          disabled={acting}
          onClick={() => setPending(null)}
        >
          <CloseIcon className="h-4 w-4" />
          Revenir en arrière
        </Button>
      </div>
    </DangerPanel>
  );
}
