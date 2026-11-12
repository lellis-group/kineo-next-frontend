import { Button } from "@/components/atoms/button";
import { ApiError } from "@/lib/api-client";
import { STRIP_CONTAINER } from "@/lib/layout";

/**
 * A refresh that failed, over content that is still on screen (unlike
 * `ErrorState`, it keeps the working view and its chips). A 429 gets its own
 * copy: the reader should wait, not retry at once.
 */
export function InlineRetryBanner({
  noun,
  onRetry,
  error,
}: {
  noun: string;
  onRetry: () => void;
  /** Read only to tell a 429 apart. */
  error?: unknown;
}) {
  const rateLimited = error instanceof ApiError && error.status === 429;

  return (
    <div role="alert" className={STRIP_CONTAINER}>
      <p className="text-sm text-danger">
        {rateLimited
          ? "Trop de requêtes envoyées trop vite. Patientez un instant avant de réessayer."
          : `Actualisation impossible. ${noun} affichées peuvent être obsolètes.`}
      </p>
      <Button variant="secondary" className="shrink-0" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
