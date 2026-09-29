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
} from "@/lib/listings";

type Status = "loading" | "error" | "success";

/** Orchestrator for /listings/mine — buckets, listings and, on demand, candidates. */
export function MyListingsContainer() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<MyListingsData | null>(null);
  const [error, setError] = useState("");
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

  const load = useCallback(() => {
    setStatus("loading");
    setError("");

    const statuses =
      LISTING_FILTERS.find((option) => option.id === filter)?.statuses ?? [];

    fetchMyListings({ statuses, page })
      .then((loaded) => {
        setData(loaded);
        setStatus("success");
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
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        setStatus("error");
      });
  }, [router, filter, page]);

  useEffect(() => {
    load();
  }, [load]);

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
        setData(await fetchMyListings({ page }));

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
    [page],
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

  // Keep the previous page on refetch so the chip counters don't flash empty.
  if (status === "loading" && !data) {
    return <MyListingsSkeleton />;
  }

  if (status === "error" && !data) {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (!data) {
    return null;
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

/**
 * Loading placeholder — same rhythm as the real page (header, chips, cards at
 * the `space-y-5` rhythm) so the swap does not shift the layout under the
 * reader. Card height matches the collapsed card: padding, title, meta row,
 * divider and the action row.
 */
function MyListingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="h-9 w-64 animate-pulse rounded-control bg-surface" />
      <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded-control bg-surface" />
      <div className="mt-6 flex flex-wrap gap-2">
        {SKELETON_CHIPS.map((key) => (
          <div
            key={key}
            className="h-8 w-24 animate-pulse rounded-full bg-surface"
          />
        ))}
      </div>
      <div className="mt-8 space-y-5">
        {SKELETON_CARDS.map((key) => (
          <div
            key={key}
            className="h-52 animate-pulse rounded-2xl bg-surface"
          />
        ))}
      </div>
    </div>
  );
}

/** Static skeleton keys — no index keys. */
const SKELETON_CHIPS = ["chip-1", "chip-2", "chip-3", "chip-4", "chip-5"];
const SKELETON_CARDS = ["card-1", "card-2", "card-3"];
