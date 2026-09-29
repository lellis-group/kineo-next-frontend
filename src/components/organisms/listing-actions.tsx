"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { AlertIcon, CloseIcon } from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
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
  className?: string;
}

const ACTION_COPY: Record<
  ListingAction,
  { title: string; confirm: string; intro: string }
> = {
  close: {
    title: "Clôturer l'annonce",
    confirm: "Clôturer",
    intro:
      "L'annonce ne recevra plus de candidature. Les candidats qui n'ont pas encore répondu seront informés que la recherche est terminée.",
  },
  cancel: {
    title: "Annuler l'annonce",
    confirm: "Annuler l'annonce",
    intro:
      "L'annonce disparaît de la plateforme sans qu'un remplacement ait été trouvé. Les candidats en attente seront informés que l'annonce est abandonnée.",
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
  className,
}: ListingActionsProps) {
  const [pending, setPending] = useState<ListingAction | null>(null);

  // With nobody waiting there is no consequence to warn about.
  const needsConfirm = activeCount > 0;

  // One trigger row, used whether or not a confirmation follows: the buttons
  // must not move or change label when a step is added.
  const triggers = (
    <>
      <Button
        variant="outline"
        onClick={() => (needsConfirm ? setPending("close") : onClose())}
        disabled={acting}
      >
        {acting && pending === null && (
          <Spinner className="h-4 w-4 border-foreground/30 border-t-foreground" />
        )}
        Clôturer l&apos;annonce
      </Button>
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

  if (!needsConfirm) {
    return <div className={className}>{triggers}</div>;
  }

  if (!pending) {
    return <div className={className}>{triggers}</div>;
  }

  const copy = ACTION_COPY[pending];

  return (
    <Card className="border-danger/30 bg-danger/5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger"
        >
          <AlertIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-danger">{copy.title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">
            {copy.intro}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">
        {activeCount} candidature{plural(activeCount)} en cours{" "}
        {activeCount > 1 ? "seront terminées" : "sera terminée"}.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="danger"
          disabled={acting}
          onClick={pending === "close" ? onClose : onCancel}
        >
          {acting && (
            <Spinner className="h-4 w-4 border-danger-foreground/30 border-t-danger-foreground" />
          )}
          Confirmer&nbsp;: {copy.confirm.toLowerCase()}
        </Button>
        <Button
          variant="ghost"
          disabled={acting}
          onClick={() => setPending(null)}
        >
          <CloseIcon className="h-4 w-4" />
          Revenir en arrière
        </Button>
      </div>
    </Card>
  );
}
