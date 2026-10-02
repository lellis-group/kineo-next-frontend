"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/atoms/button";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { SubmitButton } from "@/components/molecules/submit-button";

/** One input in an editable row. */
export interface EditableField {
  name: string;
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  placeholder?: string;
}

/**
 * A read-only value with an edit button that becomes a small inline form.
 *
 * The profile page has two of these — name and email — and they were written out
 * separately, down to a duplicated `<form>` wrapper and a duplicated cancel row.
 *
 * Each row owns its own editing, error and success state, which is the part worth
 * having a component for. They used to share one `error` and one `success` string
 * between them, and both leaked:
 *
 *  - a failed email change left its message sitting in the *name* form, because
 *    switching rows is one click on a button that is still on screen and nothing
 *    cleared the error on the way;
 *  - the success banner rendered above whichever row happened to be first, so a
 *    name update reported itself inside the email block.
 *
 * Nothing needed to be invalid for either to happen.
 */
export function EditableRow({
  label,
  display,
  fields,
  editLabel,
  editIcon,
  submitLabel,
  pendingLabel,
  onSubmit,
}: {
  /** Small caption above the value (« Nom », « Email »). */
  label: string;
  /** Read-only content: the value, plus any secondary line. */
  display: ReactNode;
  fields: readonly EditableField[];
  editLabel: string;
  editIcon: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  /**
   * Receives the submitted values by field name. Returning a string means "this
   * is the message to confirm" — the write succeeded and the backend had
   * something to say. Throwing means it failed, and the thrown message is shown
   * as-is; callers throw `mapUserError(err)` so the wording stays in the service.
   */
  onSubmit: (values: Record<string, string>) => Promise<string | undefined>;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleAction(formData: FormData) {
    setError("");
    const values = Object.fromEntries(
      fields.map((field) => [
        field.name,
        ((formData.get(field.name) as string | null) ?? "").trim(),
      ]),
    );

    try {
      const message = await onSubmit(values);
      setEditing(false);
      setSuccess(message ?? "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer. Réessayez dans un instant.",
      );
    }
  }

  function startEditing() {
    setSuccess("");
    setError("");
    setEditing(true);
  }

  return (
    <>
      {editing ? (
        <form
          action={handleAction}
          className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3"
        >
          {fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1.5">
              <span className="field-label">{field.label}</span>
              <input
                name={field.name}
                type={field.type ?? "text"}
                required={field.required}
                maxLength={field.maxLength}
                pattern={field.pattern}
                autoComplete={field.autoComplete}
                defaultValue={field.value}
                placeholder={field.placeholder}
                className="field-input"
              />
            </label>
          ))}

          {error && (
            <InlineAlert as="p" tone="danger">
              {error}
            </InlineAlert>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{label}</p>
            <div className="truncate text-sm font-medium break-all">
              {display}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="shrink-0"
            onClick={startEditing}
          >
            {editIcon}
            {editLabel}
          </Button>
        </div>
      )}

      {success && (
        <InlineAlert as="p" tone="success" className="text-sm">
          {success}
        </InlineAlert>
      )}
    </>
  );
}
