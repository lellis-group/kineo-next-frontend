"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/organisms/error-state";
import { MyListingsView } from "@/components/templates/my-listings-view";
import { ApiError } from "@/lib/api-client";
import {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListings,
  LISTING_FILTERS,
  type ListingsFilter,
  type MyListingsData,
  type ReceivedApplication,
  type ReplacementListingStatus,
} from "@/lib/listings";

/**
 * The backend statuses behind a chip; an empty list means « no filter ».
 *
 * Every read on this screen goes through here, so a refetch cannot end up
 * asking for a different slice than the one the chips are describing.
 */
function statusesForFilter(filter: ListingsFilter): ReplacementListingStatus[] {
  return LISTING_FILTERS.find((option) => option.id === filter)?.statuses ?? [];
}

/**
 * Orchestrator for /listings/mine — buckets, listings and, on demand, candidates.
 *
 * The unfiltered first page arrives from the server page, so a cold load shows
 * the listings rather than a skeleton. Switching bucket still fetches, and so
 * does re-reading after an action: both change which rows the chips describe.
 */
export function MyListingsContainer({
  initialData,
}: {
  initialData: MyListingsData;
}) {
  const router = useRouter();
  const [data, setData] = useState<MyListingsData>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<ListingActionError | null>(
    null,
  );
  const [actionFeedback, setActionFeedback] =
    useState<ListingActionError | null>(null);
  const [filter, setFilter] = useState<ListingsFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedListingId, setExpandedListingId] = useState<string>();
  const [loadingListingId, setLoadingListingId] = useState<string>();
  const [actingListingId, setActingListingId] = useState<string>();
  const [applicationsByListing, setApplicationsByListing] = useState<
    Record<string, ReceivedApplication[]>
  >({});

  const load = useCallback(
    (targetFilter: ListingsFilter, targetPage: number) => {
      setError(null);

      fetchMyListings({
        statuses: statusesForFilter(targetFilter),
        page: targetPage,
      })
        .then((loaded) => {
          setData(loaded);
          // The refetched rows are the truth; anything cached for them may
          // describe an application that has since been withdrawn elsewhere.
          setApplicationsByListing({});
          setExpandedListingId(undefined);
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            router.replace("/signin");
            return;
          }
          setError(err);
        });
    },
    [router],
  );

  // The unfiltered first page came from the server; only a bucket change has to
  // re-read. `page` never moves off 1 here — the screen has no pagination
  // control — so it is deliberately not a trigger.
  const isServerProvided = filter === "ALL" && page === 1;

  useEffect(() => {
    if (isServerProvided) return;
    load(filter, page);
  }, [isServerProvided, load, filter, page]);

  // Candidates are fetched on demand: a practice with ten listings should not
  // pay for ten requests to read one of them.
  const handleToggle = useCallback(
    (listingId: string) => {
      setActionError(null);

      if (expandedListingId === listingId) {
        setExpandedListingId(undefined);
        return;
      }

      setExpandedListingId(listingId);

      if (applicationsByListing[listingId]) {
        return;
      }

      setLoadingListingId(listingId);

      fetchListingApplications(listingId)
        .then((result) => {
          setApplicationsByListing((current) => ({
            ...current,
            [listingId]: result.applications,
          }));
        })
        .catch((err) => {
          setActionError({
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
    [expandedListingId, applicationsByListing],
  );

  const runAction = useCallback(
    async (
      listingId: string,
      action: (id: string) => Promise<void>,
      successMessage: string,
    ) => {
      setActingListingId(listingId);
      setActionError(null);
      setActionFeedback(null);

      try {
        await action(listingId);

        // Re-read rather than patch the count locally: `close` and `cancel`
        // both terminate the applications server-side and recalculate the
        // listing status, so the authoritative counts come back from the API.
        //
        // The active bucket is carried over: refetching without it would swap
        // the rows under a chip row still showing the old bucket selected.
        setData(
          await fetchMyListings({ statuses: statusesForFilter(filter), page }),
        );

        // The candidates just left the pipeline, so the cached panel is stale.
        setApplicationsByListing((current) => {
          const { [listingId]: _removed, ...rest } = current;
          return rest;
        });
        setExpandedListingId(undefined);
        setActionFeedback({ listingId, message: successMessage });
      } catch (err) {
        setActionError({
          listingId,
          message:
            err instanceof Error
              ? err.message
              : "L'opération a échoué. Veuillez réessayer.",
        });
      } finally {
        setActingListingId(undefined);
      }
    },
    [filter, page],
  );

  /**
   * Switching bucket drops every per-listing state.
   *
   * The messages are scoped by listing id, so a stale one is invisible while its
   * listing is filtered out — and then reappears on a freshly refetched card
   * when the user comes back to « Toutes », several minutes after the action it
   * describes. The candidate cache has the same problem: a panel that was
   * expanded once is never refetched for the rest of the mount, so a
   * withdrawal made elsewhere stays invisible.
   */
  const handleFilterChange = useCallback((next: ListingsFilter) => {
    setFilter(next);
    setPage(1);
    setActionError(null);
    setActionFeedback(null);
    setExpandedListingId(undefined);
    setApplicationsByListing({});
  }, []);

  const handleClose = useCallback(
    (listingId: string) =>
      runAction(
        listingId,
        closeListing,
        "Annonce clôturée. Les candidatures en cours ont été terminées.",
      ),
    [runAction],
  );

  const handleCancel = useCallback(
    (listingId: string) =>
      runAction(
        listingId,
        cancelListing,
        "Annonce annulée. Les candidatures en cours ont été terminées.",
      ),
    [runAction],
  );

  if (error && isServerProvided) {
    return <ErrorState error={error} onRetry={() => load(filter, page)} />;
  }

  return (
    <MyListingsView
      listings={data.listings}
      counts={data.counts}
      currentFilter={filter}
      onFilterChange={handleFilterChange}
      applicationsByListing={applicationsByListing}
      expandedListingId={expandedListingId}
      loadingListingId={loadingListingId}
      actingListingId={actingListingId}
      actionError={actionError}
      actionFeedback={actionFeedback}
      onToggle={handleToggle}
      onClose={handleClose}
      onCancel={handleCancel}
    />
  );
}

/**
 * A message bound to the listing it concerns.
 *
 * The id travels *with* the message rather than in a parallel state: keeping
 * them apart is what let a single failure render on every card, because the
 * view had no way to tell which listing the bare string belonged to.
 */
interface ListingActionError {
  listingId: string;
  message: string;
}
