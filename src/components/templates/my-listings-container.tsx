"use client";

import { useMemo, useState } from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import { MyListingsView } from "@/components/templates/my-listings-view";
import { useExpandedCandidates } from "@/lib/hooks/use-expanded-candidates";
import { useListingAction } from "@/lib/hooks/use-listing-action";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import {
  cancelListing,
  closeListing,
  fetchMyListings,
  LISTING_FILTERS,
  type ListingsFilter,
  MY_LISTINGS_PAGE_SIZE,
  type MyListingsData,
} from "@/lib/listings";
import type { ReplacementListingStatus } from "@/lib/types/api";

interface View {
  page: number;
  filter: ListingsFilter;
  urgentOnly: boolean;
}

const DEFAULT_FILTER: ListingsFilter = "ALL";

/**
 * The urgency toggle is part of the default-view test, and that is the point: it
 * is a narrowing the *server* has to apply, so a « Toutes » first page reached
 * with the toggle on is not the view the server delivered. Restoring
 * `initialData` there would silently drop the filter the reader just asked for.
 */
function isDefaultView(view: View): boolean {
  return view.page === 1 && view.filter === DEFAULT_FILTER && !view.urgentOnly;
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
    limit: MY_LISTINGS_PAGE_SIZE,
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
}: {
  initialData: MyListingsData;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ListingsFilter>(DEFAULT_FILTER);
  const [urgentOnly, setUrgentOnly] = useState(false);

  const view = useMemo(
    () => ({ page, filter, urgentOnly }),
    [page, filter, urgentOnly],
  );

  const candidates = useExpandedCandidates();

  const { data, error, reload, replace } = usePaginatedResource<
    MyListingsData,
    View
  >({
    initialData,
    view,
    isDefaultView,
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

  return (
    <>
      {/* Never fatal: the server always delivered the default bucket. */}
      {error !== null && (
        <InlineRetryBanner noun="Les annonces" onRetry={reload} />
      )}
      <MyListingsView
        listings={data.listings}
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
            closeListing,
            "Annonce clôturée. Les candidatures en cours ont été terminées.",
          )
        }
        onCancel={(listingId) =>
          action.run(
            listingId,
            cancelListing,
            "Annonce annulée. Les candidatures en cours ont été terminées.",
          )
        }
      />
    </>
  );
}
