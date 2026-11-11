"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { PencilIcon } from "@/components/atoms/icons";
import { CountedTextarea } from "@/components/molecules/counted-textarea";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import { errorMessage } from "@/lib/api-errors";
import { useAsyncSubmit } from "@/lib/hooks/use-async-submit";

export interface ApplicationMessageProps {
  message?: string;
  /** Editable while the application is pending — the caller gates this. */
  canEdit?: boolean;
  onSaveMessage: (message: string) => Promise<void>;
}

/** Backend UpdateApplicationDto — required message, 1-2000 chars. */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Editing is refused once the practice has answered, so the 400 is a state the
 * reader can act on rather than a fault to retry.
 */
const MESSAGE_COPY = {
  conflict: "Cette candidature ne peut plus être modifiée.",
  unavailable: "L'enregistrement a échoué pour le moment. Veuillez réessayer.",
  "service-down":
    "Le service est hors service : votre message n'a pas été enregistré. Réessayez dans quelques minutes.",
} as const;

export function ApplicationMessage({
  message,
  canEdit = false,
  onSaveMessage,
}: ApplicationMessageProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const {
    pending: saving,
    error,
    run,
    clearError,
  } = useAsyncSubmit((err) => errorMessage(err, MESSAGE_COPY));

  function startEditing() {
    setDraft(message ?? "");
    clearError();
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (await run(() => onSaveMessage(trimmed))) setEditing(false);
  }

  if (editing) {
    return (
      <section aria-label="Votre message">
        <form onSubmit={handleSubmit}>
          <CountedTextarea
            label="Votre message"
            value={draft}
            onChange={setDraft}
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Précisez vos disponibilités, votre expérience sur ce type de remplacement…"
          />

          {error && (
            <InlineAlert as="p" tone="danger" className="mt-3">
              {error}
            </InlineAlert>
          )}

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <PendingButton
              type="submit"
              pending={saving}
              disabled={!draft.trim()}
              idleLabel="Enregistrer"
              pendingLabel="Enregistrement…"
            />
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section aria-label="Votre message">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-foreground">Votre message</h2>
        {canEdit && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            {message ? "Modifier" : "Ajouter un message"}
          </button>
        )}
      </div>

      {message ? (
        <blockquote className="mt-4 whitespace-pre-line rounded-control bg-surface-2 p-4 text-sm leading-relaxed text-muted sm:p-5">
          {message}
        </blockquote>
      ) : (
        <p className="mt-4 text-sm italic text-muted">
          Aucun message n'a été envoyé avec cette candidature.
        </p>
      )}
    </section>
  );
}
