"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchListingApplications,
  type ListingApplicationsData,
  type ListingMessage,
  listingReadErrorMessage,
} from "@/lib/listings";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/**
 * Candidates for the listings a practice chooses to open, fetched on demand.
 *
 * A practice with ten listings should not pay for ten requests to read one of
 * them, so a panel is fetched the first time its card is expanded and then kept
 * for the rest of the mount.
 *
 * That caching is also why the cache has to be dropped whenever the rows behind
 * it change. A panel expanded once is otherwise never refetched, so a withdrawal
 * made in another tab — or by the `close` action on the same screen — stays
 * invisible until a full reload. `clear` is what `usePaginatedResource`'s
 * `onLoaded` and the action's `onSettled` call.
 *
 * ## The cancellation guard is not optional
 *
 * This hook had none, while `usePaginatedResource` has had one since the second
 * screen that needed it. Two reads cannot be in flight here at once — only the
 * expanded panel is ever fetching — so the race is narrower than on a list, and
 * it is just as silent: expanding a card, then expanding the next one before the
 * answer arrives, let the first answer land last and fill the cache with the
 * panel of a card the reader walked away from, under a spinner that had already
 * stopped. The same holds for a bucket change (`clear`) or an owner action
 * (`forget`), which drop the cache while a read for a card that is leaving the
 * screen is still running.
 *
 * The request id decides who may write; the `AbortSignal` stops the read that
 * lost rather than only ignoring its answer, which is the pair
 * `usePaginatedResource` uses. Only one read runs at a time here, so one
 * controller and one id are enough — no per-listing bookkeeping, which would only
 * matter with several in flight.
 */
export function useExpandedCandidates() {
  const router = useRouter();
  const [receivedByListing, setReceivedByListing] = useState<
    Record<string, ListingApplicationsData>
  >({});
  const [expandedListingId, setExpandedListingId] = useState<string>();
  const [loadingListingId, setLoadingListingId] = useState<string>();
  const [panelError, setPanelError] = useState<ListingMessage | null>(null);

  /** Bumped per request; a response with a stale id is discarded. */
  const requestId = useRef(0);
  /** The read the last expansion started, cancelled by the next one. */
  const inFlight = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    requestId.current += 1;
  }, []);

  // A read still running when the screen goes away has nobody to report to.
  useEffect(() => () => cancel(), [cancel]);

  const clear = useCallback(() => {
    cancel();
    setReceivedByListing({});
    setExpandedListingId(undefined);
    setLoadingListingId(undefined);
    setPanelError(null);
  }, [cancel]);

  /** Drops one listing's cached panel, leaving the rest — used after an action. */
  const forget = useCallback(
    (listingId: string) => {
      cancel();
      setReceivedByListing(({ [listingId]: _removed, ...rest }) => rest);
      setExpandedListingId(undefined);
      setLoadingListingId(undefined);
      setPanelError(null);
    },
    [cancel],
  );

  const toggle = useCallback(
    (listingId: string) => {
      // Whatever was loading has just been superseded: by the collapse below, by
      // the panel taking this listing's place, or by the cache hit further down.
      cancel();

      if (expandedListingId === listingId) {
        setExpandedListingId(undefined);
        return;
      }

      setExpandedListingId(listingId);
      setPanelError(null);

      if (receivedByListing[listingId]) {
        return;
      }

      const controller = new AbortController();
      inFlight.current = controller;
      requestId.current += 1;
      const mine = requestId.current;

      setLoadingListingId(listingId);

      fetchListingApplications(listingId, {}, undefined, {
        signal: controller.signal,
      })
        .then((result) => {
          if (mine !== requestId.current) return;
          inFlight.current = null;
          setLoadingListingId(undefined);
          setReceivedByListing((current) => ({
            ...current,
            [listingId]: result,
          }));
        })
        .catch((err) => {
          if (mine !== requestId.current) return;
          inFlight.current = null;
          setLoadingListingId(undefined);
          // The abort above, not a broken endpoint: the reader is looking at
          // another panel, and « could not read » would be a fault they did not
          // do anything to cause.
          if (controller.signal.aborted) return;
          if (signInOnExpiredSession(err, router)) return;
          // Panel-level, not page-level: the rest of the screen is still
          // readable, so replacing it would be a worse answer than saying this
          // one panel failed. Scoped by listing so the card can show it in place.
          setPanelError({ listingId, message: listingReadErrorMessage(err) });
        });
    },
    [cancel, expandedListingId, receivedByListing, router],
  );

  return {
    receivedByListing,
    expandedListingId,
    loadingListingId,
    panelError,
    toggle,
    clear,
    forget,
  };
}
