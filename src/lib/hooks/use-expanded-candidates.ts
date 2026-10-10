"use client";

import { useCallback, useState } from "react";
import {
  fetchListingApplications,
  type ListingApplicationsData,
  type ListingMessage,
} from "@/lib/listings";

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
 */
export function useExpandedCandidates() {
  const [receivedByListing, setReceivedByListing] = useState<
    Record<string, ListingApplicationsData>
  >({});
  const [expandedListingId, setExpandedListingId] = useState<string>();
  const [loadingListingId, setLoadingListingId] = useState<string>();
  const [panelError, setPanelError] = useState<ListingMessage | null>(null);

  const clear = useCallback(() => {
    setReceivedByListing({});
    setExpandedListingId(undefined);
    setPanelError(null);
  }, []);

  /** Drops one listing's cached panel, leaving the rest — used after an action. */
  const forget = useCallback((listingId: string) => {
    setReceivedByListing(({ [listingId]: _removed, ...rest }) => rest);
    setExpandedListingId(undefined);
    setPanelError(null);
  }, []);

  const toggle = useCallback(
    (listingId: string) => {
      if (expandedListingId === listingId) {
        setExpandedListingId(undefined);
        return;
      }

      setExpandedListingId(listingId);
      setPanelError(null);

      if (receivedByListing[listingId]) {
        return;
      }

      setLoadingListingId(listingId);

      fetchListingApplications(listingId)
        .then((result) => {
          setReceivedByListing((current) => ({
            ...current,
            [listingId]: result,
          }));
        })
        .catch((err) => {
          // Panel-level, not page-level: the rest of the screen is still
          // readable, so replacing it would be a worse answer than saying this
          // one panel failed. Scoped by listing so the card can show it in place.
          setPanelError({
            listingId,
            message:
              err instanceof Error
                ? err.message
                : "Impossible de charger les candidatures.",
          });
        })
        .finally(() => {
          setLoadingListingId(undefined);
        });
    },
    [expandedListingId, receivedByListing],
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
