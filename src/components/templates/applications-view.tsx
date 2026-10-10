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
  countForSituation,
  REJECTION_SITUATIONS,
  type RejectionSituationFilter,
} from "@/lib/applications";
import { PAGE_CONTAINER } from "@/lib/layout";

interface ApplicationsViewProps {
  data: ApplicationsData;
  onPageChange: (page: number) => void;
  onFilterChange: (filter: ApplicationsFilter) => void;
  currentFilter: ApplicationsFilter;
  currentSituation: RejectionSituationFilter;
  onSituationChange: (situation: RejectionSituationFilter) => void;
}

export function ApplicationsView({
  data,
  onPageChange,
  onFilterChange,
  currentFilter,
  currentSituation,
  onSituationChange,
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

      {/*
       * Only under « Refusées », and only for the situations that exist. Every
       * rejected row a candidate holds is in one of the three or in none — the
       * backend says which — so an empty list here is a reason to hide the row, not
       * three chips reading 0.
       */}
      {currentFilter === "REFUSED" && hasSituation(data) && (
        <FilterChips
          ariaLabel="Filtrer les candidatures refusées par situation"
          className="mt-3"
          options={REJECTION_SITUATIONS.map((option) => ({
            ...option,
            count: countForSituation(option.id, data),
          }))}
          value={currentSituation}
          onChange={onSituationChange}
        />
      )}

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

/**
 * Whether any of the three situations is confirmed to have happened.
 *
 * Over the named buckets only, never over « Toutes »: that one reads the rejected
 * total, and an erasure settles a rejection without putting it in any of the three.
 * Including it would show three chips reading 0 under a row of applications the
 * candidate can plainly see.
 *
 * The totals describe the whole collection, so this stays true while a situation is
 * selected and the list below is narrowed to it — hiding the row then would take
 * away the only way back out.
 */
function hasSituation(data: ApplicationsData): boolean {
  return REJECTION_SITUATIONS.some(
    (option) => option.id !== "ALL" && countForSituation(option.id, data) > 0,
  );
}
