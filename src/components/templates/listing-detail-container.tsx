"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ListingDetailView } from "@/components/templates/listing-detail-view";
import { ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/api-errors";
import {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListing,
  LISTING_APPLICATIONS_PAGE_SIZE,
  type ListingApplicationsData,
  type MyListing,
  RECEIVED_FILTERS,
  type ReceivedApplicationsFilter,
} from "@/lib/listings";
import type { ApplicationStatus } from "@/lib/types/api";

/**
 * A failed read, in French, with the 403 case spelled out.
 *
 * The candidates endpoint answers a bare English « You do not own this listing »
 * on a 403, which is the same string the service layer maps for the *write*
 * actions. Surfacing `err.message` instead put that sentence — plus the
 * `API 403 (/applications/listing/…):` prefix `apiFetch` builds — in front of a
 * French-speaking practice. `errorMessage` classifies the typed status; only the
 * 403 needed domain wording, because the generic « action non autorisée » copy
 * is about the unverified-email guard and would have sent them to check an
 * address that is fine.
 */
function readErrorMessage(error: unknown): string {
  return errorMessage(error, {
    forbidden:
      "Cette annonce ne vous appartient pas, ou elle n'existe plus. Retournez à vos annonces.",
  });
}

/** The backend status behind a candidate chip; undefined means « no filter ». */
function statusForFilter(
  filter: ReceivedApplicationsFilter,
): ApplicationStatus | undefined {
  return RECEIVED_FILTERS.find((option) => option.id === filter)?.status;
}

/**
 * Orchestrator for /listings/mine/[id] — renders ListingDetailView.
 *
 * The listing and the first page of candidates both arrive from the server page,
 * so the route is readable on arrival. Everything after that is client state:
 * filtering the candidates, paging them, and re-reading after an action.
 */
export function ListingDetailContainer({
  listingId,
  initialListing,
  initialReceived,
}: {
  listingId: string;
  initialListing: MyListing;
  initialReceived: ListingApplicationsData;
}) {
  const router = useRouter();
  const [listing, setListing] = useState<MyListing>(initialListing);
  const [received, setReceived] =
    useState<ListingApplicationsData>(initialReceived);
  const [filter, setFilter] = useState<ReceivedApplicationsFilter>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  /**
   * Re-reads the candidates.
   *
   * The default view (no filter, first page) is *restored* from the server
   * payload rather than skipped, exactly as the list screen does: coming back to
   * « Tous » is a request like any other, and skipping it left the previous
   * filter's rows on screen under a chip row that had already switched.
   */
  useEffect(() => {
    if (filter === "ALL" && page === 1) {
      setReceived(initialReceived);
      setError(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);

    fetchListingApplications(listingId, {
      status: statusForFilter(filter),
      page,
      limit: LISTING_APPLICATIONS_PAGE_SIZE,
    })
      .then((data) => {
        if (!cancelled) setReceived(data);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/signin");
          return;
        }
        if (!cancelled) setError(readErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, page, initialReceived, listingId, router]);

  const handleFilterChange = useCallback((next: ReceivedApplicationsFilter) => {
    setFilter(next);
    setPage(1);
    setFeedback(undefined);
    setError(undefined);
  }, []);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  const runAction = useCallback(
    async (action: (id: string) => Promise<void>, successMessage: string) => {
      setActing(true);
      setError(undefined);
      setFeedback(undefined);

      try {
        await action(listingId);

        // Both halves are re-read rather than patched. `close` and `cancel`
        // terminate the active applications server-side and recompute the
        // listing status, so the authoritative numbers only come from the API —
        // and the candidates just moved status, which means the current filter
        // may now be describing an empty bucket for a reason.
        const [updatedListing, updatedReceived] = await Promise.all([
          fetchMyListing(listingId),
          fetchListingApplications(listingId, {
            status: statusForFilter(filter),
            page,
            limit: LISTING_APPLICATIONS_PAGE_SIZE,
          }),
        ]);

        setListing(updatedListing);
        setReceived(updatedReceived);
        setFeedback(successMessage);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/signin");
          return;
        }
        // `closeListing` / `cancelListing` already come back as French sentences
        // (see `mapListingActionError`); only the re-reads that follow can throw
        // a raw API error, so the classifier covers what they leave behind.
        setError(
          err instanceof ApiError ? readErrorMessage(err) : errorMessage(err),
        );
      } finally {
        setActing(false);
      }
    },
    [listingId, filter, page, router],
  );

  const handleClose = useCallback(
    () =>
      runAction(
        closeListing,
        "Annonce clôturée. Les candidatures en cours ont été terminées.",
      ),
    [runAction],
  );

  const handleCancel = useCallback(
    () =>
      runAction(
        cancelListing,
        "Annonce annulée. Les candidatures en cours ont été terminées.",
      ),
    [runAction],
  );

  return (
    <ListingDetailView
      listing={listing}
      received={received}
      receivedFilter={filter}
      onReceivedFilterChange={handleFilterChange}
      onPageChange={handlePageChange}
      loading={loading}
      acting={acting}
      error={error}
      feedback={feedback}
      onClose={handleClose}
      onCancel={handleCancel}
    />
  );
}
