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
 * One owner action (close, cancel) against a listing, with its own state.
 *
 * Two screens run the same sequence: mark the listing busy, clear the previous
 * outcome, perform the write, re-read whatever the write invalidated, then report
 * in French. It was written out twice, and the re-read is the part that must not
 * be skipped.
 *
 * ## The action is named, not passed
 *
 * `run` takes `"close"` or `"cancel"` rather than the function to call. The
 * refusal sentence needs to name the action — « clôturee » is not French, and a
 * sentence about closing shown on a cancel is about the wrong thing — and the
 * only place that knows the pairing of verb and participle is the domain module.
 * Handing the function in would mean handing the verb in too.
 *
 * ## Errors are formatted here, not at the call site
 *
 * The service used to throw `Error(frenchSentence)`, which made the hook's
 * `err instanceof Error ? err.message` do the display and left the typed error
 * unreadable to anything that cared. The write now lets the `ApiError` through
 * and the hook asks `listingActionErrorMessage` for a sentence — which is also
 * where an expired session is caught, before it can be reported as a failed
 * action: a session that ended mid-write gets the sign-in page, not « Veuillez
 * réessayer ».
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
        // Re-read rather than patch the count locally: `close` and `cancel` both
        // terminate the applications server-side and recompute the listing
        // status, so the authoritative numbers only come back from the API.
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
