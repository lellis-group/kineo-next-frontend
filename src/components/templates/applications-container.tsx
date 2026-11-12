"use client";

import { useCallback, useMemo, useState } from "react";
import { InlineRetryBanner } from "@/components/molecules/inline-retry-banner";
import { ApplicationsView } from "@/components/templates/applications-view";
import {
  APPLICATION_FILTERS,
  type ApplicationsData,
  type ApplicationsFilter,
  fetchApplicationsData,
  type RejectionSituationFilter,
} from "@/lib/applications";
import { usePaginatedResource } from "@/lib/hooks/use-paginated-resource";
import { type ApplicationsPageSize, rememberPageSize } from "@/lib/page-size";

interface View {
  page: number;
  filter: ApplicationsFilter;
  /** Which situation, within « Refusées » only. */
  situation: RejectionSituationFilter;
  pageSize: ApplicationsPageSize;
}

const DEFAULT_FILTER: ApplicationsFilter = "ALL";

/** The page size is part of the test: `initialData` is at the seeded size. */
function isDefaultView(
  view: View,
  seededPageSize: ApplicationsPageSize,
): boolean {
  return (
    view.page === 1 &&
    view.filter === DEFAULT_FILTER &&
    view.situation === "ALL" &&
    view.pageSize === seededPageSize
  );
}

/**
 * Orchestrator for /applications. The first page of « Toutes » arrives from
 * the server; every other view is client state.
 */
export function ApplicationsContainer({
  initialData,
  initialPageSize,
}: {
  initialData: ApplicationsData;
  initialPageSize: ApplicationsPageSize;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ApplicationsFilter>(DEFAULT_FILTER);
  const [situation, setSituation] = useState<RejectionSituationFilter>("ALL");
  const [pageSize, setPageSize] =
    useState<ApplicationsPageSize>(initialPageSize);

  const view = useMemo(
    () => ({ page, filter, situation, pageSize }),
    [page, filter, situation, pageSize],
  );

  const load = useCallback(
    (target: View) =>
      fetchApplicationsData({
        page: target.page,
        limit: target.pageSize,
        ...bucketParams(target.filter),
        ...(target.situation === "ALL" ? {} : { bucket: target.situation }),
      }),
    [],
  );

  const { data, error, loading, reload } = usePaginatedResource<
    ApplicationsData,
    View
  >({
    initialData,
    view,
    isDefaultView: (target) => isDefaultView(target, initialPageSize),
    load,
  });

  return (
    <div>
      {/* Never fatal: the server always delivered the default view. */}
      {error !== null && (
        <InlineRetryBanner
          noun="Les candidatures"
          onRetry={reload}
          error={error}
        />
      )}
      <ApplicationsView
        data={data}
        onPageChange={setPage}
        onFilterChange={(next) => {
          setFilter(next);
          // The situation only exists among rejections.
          if (next !== "REFUSED") {
            setSituation("ALL");
          }
          setPage(1);
        }}
        currentFilter={filter}
        currentSituation={situation}
        onSituationChange={(next) => {
          setSituation(next);
          setPage(1);
        }}
        pageSize={pageSize}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
          rememberPageSize(next);
        }}
        loading={loading}
      />
    </div>
  );
}

/** The backend query a bucket stands for, or nothing for « Toutes ». */
function bucketParams(filter: ApplicationsFilter) {
  const bucket = APPLICATION_FILTERS.find((option) => option.id === filter);
  return { status: bucket?.status };
}
