"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { CloseIcon } from "@/components/atoms/icons";
import { DangerPanel } from "@/components/molecules/danger-panel";
import { PendingButton } from "@/components/molecules/pending-button";
import { plural } from "@/lib/format";

export type ListingAction = "close" | "cancel";

export interface ListingActionsProps {
  activeCount: number;
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
 * Terminal actions on a listing. Both reject every active application
 * server-side (no notification is sent), so with active candidates they ask
 * for a confirmation stating the live count; with none, they act at once.
 */
export function ListingActions({
  activeCount,
  acting,
  onClose,
  onCancel,
}: ListingActionsProps) {
  const [pending, setPending] = useState<ListingAction | null>(null);

  const needsConfirm = activeCount > 0;

  // The same trigger row either way, so the buttons never move.
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
