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
import { type PageSize, rememberPageSize } from "@/lib/page-size";

interface View {
  page: number;
  filter: ApplicationsFilter;
  /** Which situation, within « Refusées » only. */
  situation: RejectionSituationFilter;
  /** Rows per page — the reader's choice, and part of what identifies a page. */
  pageSize: PageSize;
}

const DEFAULT_FILTER: ApplicationsFilter = "ALL";

/**
 * The page size is part of this test for the same reason the situation is:
 * `initialData` is the server's answer at the size *it* seeded the page with, so
 * a reader who asks for another size is no longer looking at that answer —
 * restoring it would put the rows they had before the choice back on screen.
 */
function isDefaultView(view: View, seededPageSize: PageSize): boolean {
  // `"ALL"`, not `null`, for the situation: the state is initialised to « Toutes »,
  // so testing it against null meant this was never true — the default view was
  // refetched on every visit instead of adopting the page the server had already
  // sent.
  return (
    view.page === 1 &&
    view.filter === DEFAULT_FILTER &&
    view.situation === "ALL" &&
    view.pageSize === seededPageSize
  );
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
  initialPageSize,
}: {
  initialData: ApplicationsData;
  /** The size the server seeded the first page with — the reader's own choice. */
  initialPageSize: PageSize;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ApplicationsFilter>(DEFAULT_FILTER);
  const [situation, setSituation] = useState<RejectionSituationFilter>("ALL");
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);

  const view = useMemo(
    () => ({ page, filter, situation, pageSize }),
    [page, filter, situation, pageSize],
  );

  const load = useCallback(
    (target: View) =>
      fetchApplicationsData({
        page: target.page,
        // The chosen size travels with the view rather than beside it: the size is
        // part of what a page *is*, so a read asking for another one is a
        // different view — and a closure over the size would hide that.
        limit: target.pageSize,
        // The bucket is translated through APPLICATION_FILTERS rather than sent
        // as-is: the ids are presentation values, and the backend only knows
        // statuses and decision sources. One definition, so the chip, the request
        // and the counter cannot drift apart.
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
          // Leaving « Refusées » clears the situation with it. Carried over, it
          // would silently keep narrowing the next chip: « En attente » plus a
          // situation that only exists among rejections returns nothing, and an
          // empty list looks like a bug rather than a stale filter.
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
          // Back to the first page: the reader asked for a different slice, and
          // page 7 of 500 rows is not page 7 of what is on screen.
          setPage(1);
          // Written from the browser: the server page reads this on the next
          // visit, and a round trip to store four bytes would make the list show
          // the old size until it came back.
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
