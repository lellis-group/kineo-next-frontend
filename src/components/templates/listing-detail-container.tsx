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
   * The decisions on one received application, made to look like one call: the
   * write lands, then the bytes it invalidated come back before the button
   * unlocks (the same re-read the listing actions make, since acceptance
   * recomputes the listing status and settles the other candidates). No global
   * feedback and no per-listing `acting`: the row moving status on the page is
   * its own confirmation, and a refusal sentence is rendered by the card that
   * has the row in front of it — the page banner cannot say which card was
   * busy.
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

  /**
   * One listing is in scope here, so the scoping the list screen needs (which
   * card shows the message) collapses to the message itself.
   *
   * The writes report their own refusals (`listingActionErrorMessage`, called by
   * the hook); only the re-reads that follow can throw a raw API error, so the
   * classifier covers what they leave behind.
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
      onClose={() => action.run(listingId, "close", ACTION_SUCCESS.close)}
      onCancel={() => action.run(listingId, "cancel", ACTION_SUCCESS.cancel)}
      onApplicationViewed={onApplicationViewed}
      onApplicationShortlist={onApplicationShortlist}
      onApplicationAccept={onApplicationAccept}
      onApplicationReject={onApplicationReject}
    />
  );
}
