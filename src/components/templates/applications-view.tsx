"use client";

import { FileTextIcon } from "@/components/atoms/icons";
import { FilterChips } from "@/components/molecules/filter-chips";
import { Pagination } from "@/components/molecules/pagination";
import { ApplicationsList } from "@/components/organisms/applications-list";
import { EmptyState } from "@/components/organisms/empty-state";
import {
  APPLICATION_FILTERS,
  type ApplicationsData,
  type ApplicationsFilter,
} from "@/lib/applications";
import { PAGE_CONTAINER } from "@/lib/layout";

interface ApplicationsViewProps {
  data: ApplicationsData;
  onPageChange: (page: number) => void;
  onFilterChange: (filter: ApplicationsFilter) => void;
  currentFilter: ApplicationsFilter;
}

/**
 * Counter for one bucket.
 *
 * Sums `decisionCounts` over the keys the bucket names, because the buckets cut
 * across statuses: « Un autre candidat retenu » and « Refusées par le cabinet »
 * are both `REJECTED`, and a status-based counter would show the same number on
 * both chips. The totals come from the server over the whole collection, so
 * they hold still while paging.
 */
function countForBucket(
  option: (typeof APPLICATION_FILTERS)[number],
  data: ApplicationsData,
): number {
  if (option.id === "ALL") {
    return data.counts.total;
  }

  if (!option.countKeys) {
    // No keys declared: the bucket is exactly one status.
    return data.counts[option.id as keyof typeof data.counts] ?? 0;
  }

  // `countKeys` are decision-source names, but typed loosely so a bucket can
  // name any of them. A key the server does not send reads 0 rather than NaN —
  // the difference between « nobody in this case » and a broken counter.
  //
  // The whole map may be absent: a payload serialised before `decisionCounts`
  // existed has no such key, and indexing it unguarded threw on a page that was
  // otherwise fine. An older backend behaves the same way during a rolling
  // deploy. Empty counters are the honest degradation — the list is still
  // correct, only the numbers are missing.
  const sources = data.decisionCounts;
  if (!sources) {
    return 0;
  }

  return option.countKeys.reduce<number>(
    (sum, key) => sum + (sources[key] ?? 0),
    0,
  );
}

/** Applications tracking page — situation filters, list and pagination. */
export function ApplicationsView({
  data,
  onPageChange,
  onFilterChange,
  currentFilter,
}: ApplicationsViewProps) {
  if (data.counts.total === 0) {
    return (
      <div className={PAGE_CONTAINER}>
        <ApplicationsHeader />
        <EmptyState
          icon={<FileTextIcon className="h-8 w-8 text-primary" />}
          title="Aucune candidature pour l'instant"
          description="Parcourez les annonces ouvertes et candidatez en un clic avec un message personnalisé."
          actionLabel="Parcourir les annonces"
          actionHref="/listings"
        />
      </div>
    );
  }

  return (
    <div className={PAGE_CONTAINER}>
      <ApplicationsHeader />

      <FilterChips
        ariaLabel="Filtrer les candidatures par statut"
        className="mt-6"
        options={APPLICATION_FILTERS.map((option) => ({
          ...option,
          count: countForBucket(option, data),
        }))}
        value={currentFilter}
        onChange={onFilterChange}
      />

      <div className="mt-8">
        <ApplicationsList applications={data.applications} />
      </div>

      {/* Hidden for single-page results. */}
      {data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

function ApplicationsHeader() {
  return (
    <header>
      {/* Total already shown by the « Toutes (n) » chip. */}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Mes candidatures
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Suivez l&apos;état de vos candidatures envoyées aux cabinets.
      </p>
    </header>
  );
}
