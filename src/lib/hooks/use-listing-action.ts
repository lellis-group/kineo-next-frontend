"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  cancelListing,
  closeListing,
  type ListingActionKind,
  type ListingMessage,
  listingActionErrorMessage,
} from "@/lib/listings";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/**
 * One owner action (close, cancel) against a listing: write, re-read what it
 * invalidated, report in French. An expired session goes to sign-in rather
 * than being reported as a failure.
 *
 * Feedback is keyed by listing id, so it dies with its listing and one card's
 * buttons can disable while a sibling's stay usable.
 */
export function useListingAction<T>({
  refresh,
  onSettled,
}: {
  /** Re-reads what the write invalidated. */
  refresh: () => Promise<T>;
  onSettled: (fresh: T, listingId: string) => void;
}) {
  const router = useRouter();
  const [actingId, setActingId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<ListingMessage | null>(null);
  const [error, setError] = useState<ListingMessage | null>(null);

  const run = useCallback(
    async (
      listingId: string,
      action: ListingActionKind,
      successMessage: string,
    ) => {
      setActingId(listingId);
      setError(null);
      setFeedback(null);

      try {
        await (action === "close" ? closeListing : cancelListing)(listingId);
        // Re-read: both actions terminate applications and recompute status
        // server-side.
        onSettled(await refresh(), listingId);
        setFeedback({ listingId, message: successMessage });
      } catch (err) {
        if (signInOnExpiredSession(err, router)) return;
        setError({
          listingId,
          message: listingActionErrorMessage(err, action),
        });
      } finally {
        setActingId(undefined);
      }
    },
    [refresh, onSettled, router],
  );

  /** Clears the reported outcome, e.g. when the view changes. */
  const reset = useCallback(() => {
    setFeedback(null);
    setError(null);
  }, []);

  return { actingId, feedback, error, run, reset };
}
