"use client";

import { Button } from "@/components/atoms/button";
import { AlertIcon } from "@/components/atoms/icons";
import { StatusBlock } from "@/components/atoms/status-block";
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
      <StatusBlock
        tone="danger"
        icon={<AlertIcon className="h-8 w-8 text-danger" />}
        title="Impossible de charger vos données"
        description={errorMessage(error)}
        action={<Button onClick={onRetry}>Réessayer</Button>}
      >
        {isDev && (
          <p className="mt-2 max-w-sm wrap-break-word rounded bg-surface px-3 py-2 font-mono text-xs text-muted">
            [dev] {rawErrorText(error)}
          </p>
        )}
      </StatusBlock>
    </div>
  );
}
