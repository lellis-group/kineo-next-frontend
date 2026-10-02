"use client";

import { useCallback, useState } from "react";
import type { ListingMessage } from "@/lib/listings";

/**
 * One owner action (close, cancel) against a listing, with its own state.
 *
 * Two screens run the same sequence: mark the listing busy, clear the previous
 * outcome, perform the write, re-read whatever the write invalidated, then report
 * in French. It was written out twice, and the re-read is the part that must not
 * be skipped.
 *
 * ## Feedback is scoped by listing id, not a single string
 *
 * Because the cards render it themselves. A shared string would have to be
 * suppressed while the listing it describes is filtered out — otherwise it
 * reappears on a freshly refetched card when the reader comes back to
 * « Toutes », several minutes after the action it belongs to.
 *
 * `actingId` is an id rather than a boolean so one card's buttons can disable
 * while a sibling's stay usable; a screen with a single listing in scope (the
 * detail page) compares it to its own id.
 */
export function useListingAction<T>({
  refresh,
  onSettled,
}: {
  /**
   * Re-reads what the write invalidated and returns it. The caller decides
   * whether that is one request or several in parallel.
   */
  refresh: () => Promise<T>;
  /** Called with the re-read data and the listing it belongs to. */
  onSettled: (fresh: T, listingId: string) => void;
}) {
  const [actingId, setActingId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<ListingMessage | null>(null);
  const [error, setError] = useState<ListingMessage | null>(null);

  const run = useCallback(
    async (
      listingId: string,
      action: (id: string) => Promise<void>,
      successMessage: string,
    ) => {
      setActingId(listingId);
      setError(null);
      setFeedback(null);

      try {
        await action(listingId);
        // Re-read rather than patch the count locally: `close` and `cancel` both
        // terminate the applications server-side and recompute the listing
        // status, so the authoritative numbers only come back from the API.
        onSettled(await refresh(), listingId);
        setFeedback({ listingId, message: successMessage });
      } catch (err) {
        setError({
          listingId,
          message:
            err instanceof Error
              ? err.message
              : "L'opération a échoué. Veuillez réessayer.",
        });
      } finally {
        setActingId(undefined);
      }
    },
    [refresh, onSettled],
  );

  /**
   * Clears the reported outcome without touching what is on screen.
   *
   * Called when the view changes: a confirmation about the previous filter's rows
   * is not an answer to anything on the new ones.
   */
  const reset = useCallback(() => {
    setFeedback(null);
    setError(null);
  }, []);

  return { actingId, feedback, error, run, reset };
}
