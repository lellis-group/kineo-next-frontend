"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/organisms/error-state";
import { ApplicationsView } from "@/components/templates/applications-view";
import { ApiError } from "@/lib/api-client";
import {
  APPLICATIONS_PAGE_SIZE,
  type ApplicationsData,
  type ApplicationsFilter,
  fetchApplicationsData,
} from "@/lib/applications";

/**
 * Orchestrator for /applications — renders ApplicationsView.
 *
 * The first, unfiltered page arrives from the server page, so a cold load shows
 * the list instead of a skeleton and no request is repeated for data already in
 * the payload. Paging and filtering are client state and do fetch — the effect
 * below is what does that, and it deliberately skips the case the server
 * already covered.
 */
export function ApplicationsContainer({
  initialData,
}: {
  initialData: ApplicationsData;
}) {
  const router = useRouter();
  const [data, setData] = useState<ApplicationsData>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ApplicationsFilter>("ALL");

  const load = useCallback(
    (targetPage: number, targetFilter: ApplicationsFilter) => {
      setError(null);

      fetchApplicationsData({
        page: targetPage,
        limit: APPLICATIONS_PAGE_SIZE,
        status: targetFilter !== "ALL" ? targetFilter : undefined,
      })
        .then((applicationsData) => {
          setData(applicationsData);
        })
        .catch((err) => {
          // Deleted account or expired session: don't linger on an error card.
          // `/signin`, not `/signup` — the reader holds this account's
          // credentials, so logging back in is what they want next. See the same
          // reasoning on sign-out in `app-header.tsx`.
          if (err instanceof ApiError && err.status === 401) {
            router.replace("/signin");
            return;
          }
          setError(err);
        });
    },
    [router],
  );

  const isServerProvided = page === 1 && filter === "ALL";

  useEffect(() => {
    if (isServerProvided) return;
    load(page, filter);
  }, [isServerProvided, load, page, filter]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((newFilter: ApplicationsFilter) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  }, []);

  // A failure is only fatal while there is nothing to show. Once a page has
  // rendered, a failed refetch leaves that page in place rather than replacing
  // a working list with an error card.
  if (error && isServerProvided) {
    return <ErrorState error={error} onRetry={() => load(page, filter)} />;
  }

  return (
    <div>
      {error !== null && (
        <p className="mx-auto w-full max-w-7xl px-4 pt-4 text-sm text-danger sm:px-6">
          Actualisation impossible. Les candidatures affichées peuvent être
          obsolètes.
        </p>
      )}
      <ApplicationsView
        data={data}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
        currentFilter={filter}
      />
    </div>
  );
}
