"use client";

import { useCallback, useMemo, useState } from "react";
import { ListingDetailView } from "@/components/templates/listing-detail-view";
import { ApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/api-errors";
import { useListingAction } from "@/lib/hooks/use-listing-action";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import {
  ACTION_SUCCESS,
  acceptReceivedApplication,
  fetchListingApplications,
  fetchMyListing,
  LISTING_APPLICATIONS_PAGE_SIZE,
  type ListingApplicationsData,
  listingReadErrorMessage,
  type MyListing,
  markApplicationViewed,
  RECEIVED_FILTERS,
  type ReceivedApplicationsFilter,
  rejectReceivedApplication,
  shortlistReceivedApplication,
} from "@/lib/listings";
import type { ApplicationStatus } from "@/lib/types/api";

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
 * Orchestrator for /listings/mine/[id]. The listing and the first page of
 * candidates arrive from the server; filtering, paging and re-reads are client
 * state.
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
   * Both halves are re-read rather than patched: the actions change statuses
   * server-side. The current filter and page are kept.
   */
  const reread = useCallback(async () => {
    const [freshListing, freshReceived] = await Promise.all([
      fetchMyListing(listingId),
      load({ page, filter }),
    ]);
    return { freshListing, freshReceived };
  }, [listingId, load, page, filter]);

  const adopt = useCallback(
    ({ freshListing, freshReceived }: Awaited<ReturnType<typeof reread>>) => {
      setListing(freshListing);
      replace(freshReceived);
    },
    [replace],
  );

  const action = useListingAction({ refresh: reread, onSettled: adopt });

  /**
   * After a decision on one application, re-read like the listing actions do.
   * Refusals are rendered by the card that made the call.
   */
  const refreshAfterDecision = useCallback(
    async () => adopt(await reread()),
    [adopt, reread],
  );

  const onApplicationViewed = useCallback(
    (applicationId: string) =>
      markApplicationViewed(applicationId).then(refreshAfterDecision),
    [refreshAfterDecision],
  );
  const onApplicationShortlist = useCallback(
    (applicationId: string) =>
      shortlistReceivedApplication(applicationId).then(refreshAfterDecision),
    [refreshAfterDecision],
  );
  const onApplicationAccept = useCallback(
    (applicationId: string) =>
      acceptReceivedApplication(applicationId).then(refreshAfterDecision),
    [refreshAfterDecision],
  );
  const onApplicationReject = useCallback(
    (applicationId: string, reason: string | undefined) =>
      rejectReceivedApplication(applicationId, reason).then(
        refreshAfterDecision,
      ),
    [refreshAfterDecision],
  );

  // The writes report their own refusals; this covers the re-reads.
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
        action.reset();
      }}
      onPageChange={setPage}
      loading={loading}
      acting={action.actingId === listingId}
      error={action.error?.message ?? readError}
      feedback={action.feedback?.message}
      onClose={() => action.run(listingId, "close", ACTION_SUCCESS.close)}
      onCancel={() => action.run(listingId, "cancel", ACTION_SUCCESS.cancel)}
      onApplicationViewed={onApplicationViewed}
      onApplicationShortlist={onApplicationShortlist}
      onApplicationAccept={onApplicationAccept}
      onApplicationReject={onApplicationReject}
    />
  );
}
