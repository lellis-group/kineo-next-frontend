"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/atoms/button";
import {
  type ListingMessage,
  MyListingsView,
} from "@/components/templates/my-listings-view";
import { ApiError } from "@/lib/api-client";
import {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListings,
  LISTING_FILTERS,
  type ListingApplicationsData,
  type ListingsFilter,
  MY_LISTINGS_PAGE_SIZE,
  type MyListingsData,
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
  const [actionError, setActionError] = useState<ListingMessage | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ListingMessage | null>(
    null,
  );
  const [filter, setFilter] = useState<ListingsFilter>("ALL");
  const [page, setPage] = useState(1);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [expandedListingId, setExpandedListingId] = useState<string>();
  const [loadingListingId, setLoadingListingId] = useState<string>();
  const [actingListingId, setActingListingId] = useState<string>();
  // The whole page of candidates, not just its rows: the panel has to be able
  // to say « 10 affichées sur 24 » instead of implying it showed everything.
  const [receivedByListing, setReceivedByListing] = useState<
    Record<string, ListingApplicationsData>
  >({});

  const load = useCallback(
    (targetFilter: ListingsFilter, targetPage: number, urgent: boolean) => {
      setError(null);

      fetchMyListings({
        statuses: statusesForFilter(targetFilter),
        page: targetPage,
        limit: MY_LISTINGS_PAGE_SIZE,
        urgentOnly: urgent,
      })
        .then((loaded) => {
          setData(loaded);
          // The refetched rows are the truth; anything cached for them may
          // describe an application that has since been withdrawn elsewhere.
          setReceivedByListing({});
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

  /**
   * Whether the requested view is the one the server already delivered.
   *
   * This has to *restore* that view rather than skip work. It used to only skip
   * the fetch, which meant that coming back to « Toutes » from another bucket
   * left the previous bucket's rows on screen under a chip row that had already
   * switched. Returning to the default bucket is a request like any other, and
   * `initialData` is its answer.
   *
   * The urgency toggle is part of the key: it is a narrowing the server has to
   * apply, so a default view reached with the toggle on is not the view the
   * server delivered, and restoring `initialData` there would silently drop the
   * filter the reader just asked for.
   */
  const isDefaultView = filter === "ALL" && page === 1 && !urgentOnly;

  useEffect(() => {
    if (isDefaultView) {
      setData(initialData);
      setError(null);
      setReceivedByListing({});
      setExpandedListingId(undefined);
      return;
    }
    load(filter, page, urgentOnly);
  }, [isDefaultView, initialData, load, filter, page, urgentOnly]);

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
    [expandedListingId, receivedByListing],
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
        // The active bucket and page are carried over: refetching without them
        // would swap the rows under a chip row still showing the old selection,
        // and page 3 of a bucket that just lost a row is page 3 of nothing.
        setData(
          await fetchMyListings({
            statuses: statusesForFilter(filter),
            page,
            limit: MY_LISTINGS_PAGE_SIZE,
            urgentOnly,
          }),
        );

        // The candidates just left the pipeline, so the cached panel is stale.
        setReceivedByListing((current) => {
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
    [filter, page, urgentOnly],
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
    setReceivedByListing({});
  }, []);

  const handleUrgentToggle = useCallback(() => {
    setUrgentOnly((current) => !current);
    setPage(1);
    setActionError(null);
    setActionFeedback(null);
    setExpandedListingId(undefined);
    setReceivedByListing({});
  }, []);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
    // The new page is a different set of listings: a panel left open on the old
    // one would keep showing candidates next to a card that is no longer there.
    setExpandedListingId(undefined);
    setReceivedByListing({});
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

  // Never fatal: the server always delivered the default bucket, so there is
  // something to show even when a later read fails.
  return (
    <>
      {error !== null && (
        <div
          role="alert"
          className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6"
        >
          <p className="text-sm text-danger">
            Actualisation impossible. Les annonces affichées peuvent être
            obsolètes.
          </p>
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={() => load(filter, page, urgentOnly)}
          >
            Réessayer
          </Button>
        </div>
      )}
      <MyListingsView
        listings={data.listings}
        counts={data.counts}
        currentFilter={filter}
        onFilterChange={handleFilterChange}
        urgentOnly={urgentOnly}
        onUrgentToggle={handleUrgentToggle}
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={handlePageChange}
        receivedByListing={receivedByListing}
        expandedListingId={expandedListingId}
        loadingListingId={loadingListingId}
        actingListingId={actingListingId}
        actionError={actionError}
        actionFeedback={actionFeedback}
        onToggle={handleToggle}
        onClose={handleClose}
        onCancel={handleCancel}
      />
    </>
  );
}
