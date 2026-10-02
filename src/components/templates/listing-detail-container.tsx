"use client";

import { useCallback, useMemo, useState } from "react";
import { ListingDetailView } from "@/components/templates/listing-detail-view";
import { ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/api-errors";
import { useListingAction } from "@/lib/hooks/use-listing-action";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import {
  cancelListing,
  closeListing,
  fetchListingApplications,
  fetchMyListing,
  LISTING_APPLICATIONS_PAGE_SIZE,
  type ListingApplicationsData,
  listingReadErrorMessage,
  type MyListing,
  RECEIVED_FILTERS,
  type ReceivedApplicationsFilter,
} from "@/lib/listings";
import type { ApplicationStatus } from "@/lib/types/api";

/** The candidate filter and page currently on screen. */
interface View {
  page: number;
  filter: ReceivedApplicationsFilter;
}

const DEFAULT_FILTER: ReceivedApplicationsFilter = "ALL";

function isDefaultView(view: View): boolean {
  return view.page === 1 && view.filter === DEFAULT_FILTER;
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
  const [listing, setListing] = useState<MyListing>(initialListing);
  const [page, setPage] = useState(1);
  const [filter, setFilter] =
    useState<ReceivedApplicationsFilter>(DEFAULT_FILTER);

  const view = useMemo(() => ({ page, filter }), [page, filter]);

  const load = useCallback(
    (target: View) =>
      fetchListingApplications(listingId, {
        status: statusForFilter(target.filter),
        page: target.page,
        limit: LISTING_APPLICATIONS_PAGE_SIZE,
      }),
    [listingId],
  );

  const {
    data: received,
    error,
    loading,
    replace,
  } = usePaginatedResource<ListingApplicationsData, View>({
    initialData: initialReceived,
    view,
    isDefaultView,
    load,
  });

  /**
   * Both halves are re-read rather than patched. `close` and `cancel` terminate
   * the active applications server-side and recompute the listing status, so the
   * authoritative numbers only come from the API — and the candidates just moved
   * status, which means the current filter may now be describing an empty bucket
   * for a real reason.
   *
   * The active filter and page are carried over: refetching without them would
   * swap the rows under a chip row still showing the old selection, and page 3 of
   * a bucket that just lost a row is page 3 of nothing.
   */
  const action = useListingAction({
    refresh: async () => {
      const [freshListing, freshReceived] = await Promise.all([
        fetchMyListing(listingId),
        fetchListingApplications(listingId, {
          status: statusForFilter(filter),
          page,
          limit: LISTING_APPLICATIONS_PAGE_SIZE,
        }),
      ]);
      return { freshListing, freshReceived };
    },
    onSettled: ({ freshListing, freshReceived }) => {
      setListing(freshListing);
      replace(freshReceived);
    },
  });

  /**
   * `closeListing` / `cancelListing` already come back as French sentences (see
   * `mapListingActionError`); only the re-reads that follow can throw a raw API
   * error, so the classifier covers what they leave behind.
   */
  /**
   * One listing is in scope here, so the scoping the list screen needs (which
   * card shows the message) collapses to the message itself.
   *
   * `closeListing` / `cancelListing` already come back as French sentences (see
   * `mapListingActionError`); only the re-reads that follow can throw a raw API
   * error, so the classifier covers what they leave behind.
   */
  const readError =
    error === null
      ? undefined
      : error instanceof ApiError
        ? listingReadErrorMessage(error)
        : errorMessage(error);

  return (
    <ListingDetailView
      listing={listing}
      received={received}
      receivedFilter={filter}
      onReceivedFilterChange={(next) => {
        setFilter(next);
        setPage(1);
        // A confirmation about the previous filter's rows is not an answer to
        // anything on the new ones.
        action.reset();
      }}
      onPageChange={setPage}
      loading={loading}
      acting={action.actingId === listingId}
      error={action.error?.message ?? readError}
      feedback={action.feedback?.message}
      onClose={() =>
        action.run(
          listingId,
          closeListing,
          "Annonce clôturée. Les candidatures en cours ont été terminées.",
        )
      }
      onCancel={() =>
        action.run(
          listingId,
          cancelListing,
          "Annonce annulée. Les candidatures en cours ont été terminées.",
        )
      }
    />
  );
}
