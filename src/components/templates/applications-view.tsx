"use client";

import { FileTextIcon } from "@/components/atoms/icons";
import { PageHeader } from "@/components/atoms/page-header";
import { FilterChips } from "@/components/molecules/filter-chips";
import { Pagination } from "@/components/molecules/pagination";
import { ApplicationsList } from "@/components/organisms/applications-list";
import { EmptyState } from "@/components/organisms/empty-state";
import {
  APPLICATION_FILTERS,
  type ApplicationsData,
  type ApplicationsFilter,
  countForBucket,
} from "@/lib/applications";
import { PAGE_CONTAINER } from "@/lib/layout";

interface ApplicationsViewProps {
  data: ApplicationsData;
  onPageChange: (page: number) => void;
  onFilterChange: (filter: ApplicationsFilter) => void;
  currentFilter: ApplicationsFilter;
}

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
      <Pagination
        currentPage={data.pagination.page}
        totalPages={data.pagination.totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function ApplicationsHeader() {
  return (
    // No total here: the « Toutes (n) » chip already carries it.
    <PageHeader
      title="Mes candidatures"
      subtitle="Suivez l&apos;état de vos candidatures envoyées aux cabinets."
    />
  );
}
