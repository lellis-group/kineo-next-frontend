"use client";

import { useCallback, useMemo, useState } from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import { ApplicationsView } from "@/components/templates/applications-view";
import {
  APPLICATION_FILTERS,
  APPLICATIONS_PAGE_SIZE,
  type ApplicationsData,
  type ApplicationsFilter,
  fetchApplicationsData,
} from "@/lib/applications";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";

interface View {
  page: number;
  filter: ApplicationsFilter;
}

const DEFAULT_FILTER: ApplicationsFilter = "ALL";

function isDefaultView(view: View): boolean {
  return view.page === 1 && view.filter === DEFAULT_FILTER;
}

/**
 * Orchestrator for /applications — renders ApplicationsView.
 *
 * The first page of « Toutes » arrives from the server page, so a cold load shows
 * the list rather than a skeleton; every other view is client state. That
 * pairing, and the redirect an expired session triggers, are `usePaginatedResource`'s
 * — the same two rules the listings screens follow.
 */
export function ApplicationsContainer({
  initialData,
}: {
  initialData: ApplicationsData;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ApplicationsFilter>(DEFAULT_FILTER);

  const view = useMemo(() => ({ page, filter }), [page, filter]);

  const load = useCallback(
    (target: View) =>
      fetchApplicationsData({
        page: target.page,
        limit: APPLICATIONS_PAGE_SIZE,
        // The bucket is translated through APPLICATION_FILTERS rather than sent
        // as-is: the ids are presentation values, and the backend only knows
        // statuses and decision sources. One definition, so the chip, the request
        // and the counter cannot drift apart.
        ...bucketParams(target.filter),
      }),
    [],
  );

  const { data, error, reload } = usePaginatedResource<ApplicationsData, View>({
    initialData,
    view,
    isDefaultView,
    load,
  });

  return (
    <div>
      {/* Never fatal: the server always delivered the default view. */}
      {error !== null && (
        <InlineRetryBanner noun="Les candidatures" onRetry={reload} />
      )}
      <ApplicationsView
        data={data}
        onPageChange={setPage}
        onFilterChange={(next) => {
          setFilter(next);
          setPage(1);
        }}
        currentFilter={filter}
      />
    </div>
  );
}

/** The backend query a bucket stands for, or nothing for « Toutes ». */
function bucketParams(filter: ApplicationsFilter) {
  const bucket = APPLICATION_FILTERS.find((option) => option.id === filter);
  return {
    status: bucket?.status,
    decisionSource: bucket?.decisionSource,
  };
}
