"use client";

import { Button } from "@/components/atoms/button";
import { AlertIcon } from "@/components/atoms/icons";
import { errorMessage, rawErrorText } from "@/lib/api-errors";

/**
 * Full-area error screen with retry.
 *
 * Takes the thrown value rather than a message, so the copy is derived from the
 * typed status (`see lib/api-errors`) and this component never has to re-read a
 * rendered string to work out what went wrong.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 rounded-full bg-danger/10 p-4">
        <AlertIcon className="h-8 w-8 text-danger" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        Impossible de charger vos données
      </h2>
      <p className="mb-2 text-sm text-muted">{errorMessage(error)}</p>
      {isDev && (
        <p className="mb-4 max-w-sm wrap-break-word rounded bg-surface px-3 py-2 font-mono text-xs text-muted">
          [dev] {rawErrorText(error)}
        </p>
      )}
      <Button onClick={onRetry}>Réessayer</Button>
    </div>
  );
}
