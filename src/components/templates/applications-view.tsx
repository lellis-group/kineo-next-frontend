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

/** Applications tracking page — status filters, list and pagination. Tab counters come from `data.counts` only. */
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
          count:
            option.id === "ALL" ? data.counts.total : data.counts[option.id],
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
