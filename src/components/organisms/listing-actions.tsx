"use client";

import { Button } from "@/components/atoms/button";
import { AlertIcon, CloseIcon } from "@/components/atoms/icons";
import { FormActions } from "@/components/molecules/form-actions";
import { PendingButton } from "@/components/molecules/pending-button";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";

export type ListingAction = "close" | "cancel";

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
 * The two terminal actions on a listing, as a row of buttons. Both reject
 * every active application server-side (no notification is sent), so with
 * active candidates a click only asks (`onAsk`) and `ListingActionConfirm`
 * takes over; with none, it acts at once. Out of circulation they stay on
 * screen, disabled, so the page always says where they are.
 */
export function ListingActionButtons({
  activeCount,
  acting,
  available = true,
  asking,
  onAsk,
  onClose,
  onCancel,
  className,
}: {
  activeCount: number;
  acting?: boolean;
  /** False once the listing is out of circulation: drawn, but disabled. */
  available?: boolean;
  /** The action awaiting its confirmation, whose button reads as pressed. */
  asking: ListingAction | null;
  onAsk: (action: ListingAction) => void;
  onClose: () => void;
  onCancel: () => void;
  className?: string;
}) {
  const needsConfirm = activeCount > 0;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <PendingButton
        variant="outline"
        pending={acting === true && asking === null}
        disabled={!available || asking !== null}
        aria-expanded={needsConfirm ? asking === "close" : undefined}
        onClick={() => (needsConfirm ? onAsk("close") : onClose())}
        idleLabel="Clôturer l'annonce"
        className={cn("px-4 py-2.5", asking === "close" && "bg-surface-2")}
      />
      <Button
        variant="outline"
        disabled={!available || acting || asking !== null}
        aria-expanded={needsConfirm ? asking === "cancel" : undefined}
        onClick={() => (needsConfirm ? onAsk("cancel") : onCancel())}
        className={cn(
          "border-danger/35 px-4 py-2.5 text-danger hover:bg-danger/10",
          asking === "cancel" && "bg-danger/10",
        )}
      >
        Annuler l&apos;annonce
      </Button>
    </div>
  );
}

/** The confirmation of a terminal action, stating how many candidates it ends. */
export function ListingActionConfirm({
  action,
  activeCount,
  acting,
  onConfirm,
  onBack,
  className,
}: {
  action: ListingAction;
  activeCount: number;
  acting?: boolean;
  onConfirm: () => void;
  onBack: () => void;
  className?: string;
}) {
  const copy = ACTION_COPY[action];

  return (
    <div
      className={cn(
        "rounded-card border border-danger/30 bg-danger/5 px-5 py-4 sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-danger">
            <AlertIcon className="size-4 shrink-0" />
            {copy.title}
          </p>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">
            {copy.intro}{" "}
            <span className="font-medium text-foreground">
              {activeCount} candidature{plural(activeCount)} en cours{" "}
              {activeCount > 1 ? "seront terminées" : "sera terminée"}.
            </span>
          </p>
        </div>

        <FormActions
          className="mt-0 shrink-0"
          type="button"
          variant="danger"
          pending={acting === true}
          submitLabel={`Confirmer : ${copy.confirm.toLowerCase()}`}
          onSubmit={onConfirm}
          onCancel={onBack}
          cancelIcon={<CloseIcon className="h-4 w-4" />}
          cancelLabel="Revenir en arrière"
        />
      </div>
    </div>
  );
}
