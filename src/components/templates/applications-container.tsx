"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/atoms/button";
import { ApplicationsView } from "@/components/templates/applications-view";
import { ApiError } from "@/lib/api-client";
import {
  APPLICATION_FILTERS,
  APPLICATIONS_PAGE_SIZE,
  type ApplicationsData,
  type ApplicationsFilter,
  fetchApplicationsData,
} from "@/lib/applications";

/**
 * Orchestrator for /applications — renders ApplicationsView.
 *
 * The default view (first page, no status filter) arrives from the server page,
 * so a cold load shows the list instead of a skeleton and the request is not
 * repeated for data already in the payload. Every other combination of bucket
 * and page is client state and fetches.
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

      // The bucket is translated through APPLICATION_FILTERS rather than sent
      // as-is: the ids are presentation values, and the backend only knows
      // statuses and decision sources. One definition, so the chip, the request
      // and the counter cannot drift apart.
      const bucket = APPLICATION_FILTERS.find(
        (option) => option.id === targetFilter,
      );

      fetchApplicationsData({
        page: targetPage,
        limit: APPLICATIONS_PAGE_SIZE,
        status: bucket?.status,
        decisionSource: bucket?.decisionSource,
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

  /**
   * Whether the requested view is the one the server already delivered.
   *
   * This has to *restore* that view rather than skip work. It used to only
   * skip the fetch, which meant that coming back to « Toutes » from another
   * bucket left the previous bucket's rows on screen under a chip row that had
   * already switched: the condition was true again, so nothing was fetched and
   * nothing was reset. Returning to the default view is a request like any
   * other, and `initialData` is its answer.
   */
  const isDefaultView = page === 1 && filter === "ALL";

  useEffect(() => {
    if (isDefaultView) {
      setData(initialData);
      setError(null);
      return;
    }
    load(page, filter);
  }, [isDefaultView, initialData, load, page, filter]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((newFilter: ApplicationsFilter) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  }, []);

  return (
    <div>
      {/* Never fatal: the server always delivered the default view, so there is
          something to show even when a later read fails. Replacing a working
          list with an error card would also hide the chips that would let the
          reader navigate out of the broken state. */}
      {error !== null && (
        <div
          role="alert"
          className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6"
        >
          <p className="text-sm text-danger">
            Actualisation impossible. Les candidatures affichées peuvent être
            obsolètes.
          </p>
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={() => load(page, filter)}
          >
            Réessayer
          </Button>
        </div>
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
