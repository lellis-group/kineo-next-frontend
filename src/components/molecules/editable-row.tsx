"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/atoms/button";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { SubmitButton } from "@/components/molecules/submit-button";

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
 * Each row owns its error and success state, so one row's message can't show
 * up in another.
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
  label: string;
  display: ReactNode;
  fields: readonly EditableField[];
  editLabel: string;
  editIcon: ReactNode;
  submitLabel: string;
  pendingLabel: string;
  /**
   * Resolves with an optional confirmation message; throws with the message to
   * show on failure (callers throw `mapUserError(err)`).
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
          className="flex flex-col gap-2 rounded-control bg-surface-2 p-3"
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
        <div className="flex items-center justify-between gap-3 rounded-control bg-surface-2 px-3 py-2.5">
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
