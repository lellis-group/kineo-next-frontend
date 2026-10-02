"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { PencilIcon } from "@/components/atoms/icons";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PendingButton } from "@/components/molecules/pending-button";
import { errorMessage } from "@/lib/api-errors";
import {
  type ApplicationEntry,
  updateApplicationMessage,
} from "@/lib/applications";

export interface ApplicationMessageProps {
  applicationId: string;
  message?: string;
  /** Editable while the application is pending — the caller gates this. */
  canEdit?: boolean;
  /** Called after a successful save — updated entry when echoed, null to refetch. */
  onSaved?: (updated: ApplicationEntry | null) => void;
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
  applicationId,
  message,
  canEdit = false,
  onSaved,
}: ApplicationMessageProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function startEditing() {
    setDraft(message ?? "");
    setError("");
    setEditing(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setError("");
    setSaving(true);
    try {
      const updated = await updateApplicationMessage(applicationId, trimmed);
      onSaved?.(updated);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, MESSAGE_COPY));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <section aria-label="Votre message">
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="application-message"
            className="flex items-baseline justify-between gap-4"
          >
            <span className="field-label">Votre message</span>
            <span className="text-xs text-faint">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </label>
          <textarea
            id="application-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Précisez vos disponibilités, votre expérience sur ce type de remplacement…"
            className="field-input mt-2 resize-none text-sm"
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
        <h2 className="text-sm font-bold text-foreground">Votre message</h2>
        {canEdit && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
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
