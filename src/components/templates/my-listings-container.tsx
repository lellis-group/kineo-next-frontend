"use client";

import { useMemo, useState } from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import { MyListingsView } from "@/components/templates/my-listings-view";
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
  pageSize: MyListingsPageSize;
}

const DEFAULT_FILTER: ListingsFilter = "ALL";

/**
 * The urgency toggle and the page size are part of the test: `initialData` is
 * the server's answer without the toggle and at the seeded size.
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

/** The backend statuses behind a chip; empty means « no filter ». */
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
 * Orchestrator for /listings/mine. The unfiltered first page arrives from the
 * server, so a cold load shows listings rather than a skeleton.
 */
export function MyListingsContainer({
  initialData,
  initialPageSize,
}: {
  initialData: MyListingsData;
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

  const { data, error, loading, reload } = usePaginatedResource<
    MyListingsData,
    View
  >({
    initialData,
    view,
    isDefaultView: (target) => isDefaultView(target, initialPageSize),
    load: loadListings,
  });

  /**
   * Safety net: the backend already applies `urgent=true`. If it ever bites,
   * the pager's totals and the rows will disagree.
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
        }}
        urgentOnly={urgentOnly}
        onUrgentToggle={() => {
          setUrgentOnly((current) => !current);
          setPage(1);
        }}
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
          rememberPageSize(next);
        }}
        loading={loading}
      />
    </>
  );
}
