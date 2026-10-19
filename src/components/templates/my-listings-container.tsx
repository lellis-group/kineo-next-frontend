"use client";

import { useMemo, useState } from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import { MyListingsView } from "@/components/templates/my-listings-view";
import { useExpandedCandidates } from "@/lib/hooks/use-expanded-candidates";
import { useListingAction } from "@/lib/hooks/use-listing-action";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import {
  fetchMyListings,
  LISTING_FILTERS,
  type ListingsFilter,
  type MyListingsData,
} from "@/lib/listings";
import { type MyListingsPageSize, rememberPageSize } from "@/lib/page-size";
import type { ReplacementListingStatus } from "@/lib/types/api";

interface View {
  page: number;
  filter: ListingsFilter;
  urgentOnly: boolean;
  /** Rows per page — the reader's choice, and part of what identifies a page. */
  pageSize: MyListingsPageSize;
}

const DEFAULT_FILTER: ListingsFilter = "ALL";

/**
 * The urgency toggle is part of the default-view test, and that is the point: it
 * is a narrowing the *server* has to apply, so a « Toutes » first page reached
 * with the toggle on is not the view the server delivered. Restoring
 * `initialData` there would silently drop the filter the reader just asked for.
 *
 * The page size joins them for the same reason. `initialData` is the server's
 * answer at the size *it* seeded the page with, so a reader who asks for another
 * size is no longer looking at that answer: restoring it would put the rows they
 * had before the choice back on screen, at the size they just rejected.
 */
function isDefaultView(
  view: View,
  seededPageSize: MyListingsPageSize,
): boolean {
  return (
    view.page === 1 &&
    view.filter === DEFAULT_FILTER &&
    !view.urgentOnly &&
    view.pageSize === seededPageSize
  );
}

/**
 * The backend statuses behind a chip; an empty list means « no filter ».
 *
 * Every read on this screen goes through here, so a refetch cannot end up asking
 * for a different slice than the one the chips are describing.
 */
function statusesForFilter(filter: ListingsFilter): ReplacementListingStatus[] {
  return LISTING_FILTERS.find((option) => option.id === filter)?.statuses ?? [];
}

function loadListings(target: View) {
  return fetchMyListings({
    statuses: statusesForFilter(target.filter),
    page: target.page,
    limit: target.pageSize,
    urgentOnly: target.urgentOnly,
  });
}

/**
 * Orchestrator for /listings/mine — buckets, listings and, on demand, candidates.
 *
 * The unfiltered first page arrives from the server page, so a cold load shows the
 * listings rather than a skeleton. Switching bucket still fetches, and so does
 * re-reading after an action: both change which rows the chips describe.
 */
export function MyListingsContainer({
  initialData,
  initialPageSize,
}: {
  initialData: MyListingsData;
  /** The size the server seeded the first page with — the reader's own choice. */
  initialPageSize: MyListingsPageSize;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ListingsFilter>(DEFAULT_FILTER);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [pageSize, setPageSize] = useState<MyListingsPageSize>(initialPageSize);

  const view = useMemo(
    () => ({ page, filter, urgentOnly, pageSize }),
    [page, filter, urgentOnly, pageSize],
  );

  const candidates = useExpandedCandidates();

  const { data, error, loading, reload, replace } = usePaginatedResource<
    MyListingsData,
    View
  >({
    initialData,
    view,
    isDefaultView: (target) => isDefaultView(target, initialPageSize),
    // The chosen size travels with the view rather than beside it: the size is
    // part of what a page *is*, so a read asking for another one is a different
    // view — and a closure over the size would hide that from the hook.
    load: loadListings,
    // The refetched rows are the truth; anything cached for them may describe an
    // application that has since been withdrawn elsewhere.
    onLoaded: candidates.clear,
    onRestored: candidates.clear,
  });

  const action = useListingAction({
    refresh: () => loadListings(view),
    onSettled: (fresh, listingId) => {
      replace(fresh);
      // That listing's candidates just left the pipeline, so its cached panel is
      // stale. The others are untouched — they did not change.
      candidates.forget(listingId);
    },
  });

  /**
   * Client-side safety net: the toggle sends `urgent=true` to the backend, but if
   * the backend ignores it the list would come back unchanged and the button
   * would look like it does nothing. Filtering here guarantees « Urgentes
   * seulement » never shows a non-urgent posting, whatever the server did.
   * When the server already filters, this one is a no-op.
   */
  const visibleListings = useMemo(
    () =>
      urgentOnly
        ? data.listings.filter((listing) => listing.urgent)
        : data.listings,
    [data.listings, urgentOnly],
  );

  return (
    <>
      {/* Never fatal: the server always delivered the default bucket. */}
      {error !== null && (
        <InlineRetryBanner noun="Les annonces" onRetry={reload} error={error} />
      )}
      <MyListingsView
        listings={visibleListings}
        counts={data.counts}
        currentFilter={filter}
        onFilterChange={(next) => {
          setFilter(next);
          setPage(1);
          candidates.clear();
        }}
        urgentOnly={urgentOnly}
        onUrgentToggle={() => {
          setUrgentOnly((current) => !current);
          setPage(1);
          candidates.clear();
        }}
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={(next) => {
          setPage(next);
          // The new page is a different set of listings: a panel left open on the
          // old one would keep showing candidates beside a card that is gone.
          candidates.clear();
        }}
        pageSize={pageSize}
        onPageSizeChange={(next) => {
          setPageSize(next);
          // Back to the first page: the reader asked for a different slice, and
          // page 7 of 500 rows is not page 7 of what is on screen. The panels go
          // with the rows.
          setPage(1);
          candidates.clear();
          // Written from the browser: the server page reads this on the next
          // visit, and a round trip to store four bytes would make the list show
          // the old size until it came back.
          rememberPageSize(next);
        }}
        loading={loading}
        receivedByListing={candidates.receivedByListing}
        expandedListingId={candidates.expandedListingId}
        loadingListingId={candidates.loadingListingId}
        actingListingId={action.actingId}
        actionError={candidates.panelError ?? action.error}
        actionFeedback={action.feedback}
        onToggle={candidates.toggle}
        onClose={(listingId) =>
          action.run(
            listingId,
            "close",
            "Annonce clôturée. Les candidatures en cours ont été terminées.",
          )
        }
        onCancel={(listingId) =>
          action.run(
            listingId,
            "cancel",
            "Annonce annulée. Les candidatures en cours ont été terminées.",
          )
        }
      />
    </>
  );
}
