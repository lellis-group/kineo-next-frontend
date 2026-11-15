import { Button } from "@/components/atoms/button";
import { ArrowRightIcon } from "@/components/atoms/icons";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterChips } from "@/components/molecules/filter-chips";
import { Pagination } from "@/components/molecules/pagination";
import { ApplicationsList } from "@/components/organisms/applications-list";
import {
  APPLICATION_FILTERS,
  type ApplicationsData,
  type ApplicationsFilter,
  awaitingDecisionCount,
  countForBucket,
  countForSituation,
  REJECTION_SITUATIONS,
  type RejectionSituationFilter,
} from "@/lib/applications";
import { WIDE_PAGE } from "@/lib/layout";
import {
  APPLICATIONS_PAGE_SIZE_CHOICES,
  type ApplicationsPageSize,
} from "@/lib/page-size";

interface ApplicationsViewProps {
  data: ApplicationsData;
  onPageChange: (page: number) => void;
  onFilterChange: (filter: ApplicationsFilter) => void;
  currentFilter: ApplicationsFilter;
  currentSituation: RejectionSituationFilter;
  onSituationChange: (situation: RejectionSituationFilter) => void;
  pageSize: ApplicationsPageSize;
  onPageSizeChange: (size: ApplicationsPageSize) => void;
  loading: boolean;
}

export function ApplicationsView({
  data,
  onPageChange,
  onFilterChange,
  currentFilter,
  currentSituation,
  onSituationChange,
  pageSize,
  onPageSizeChange,
  loading,
}: ApplicationsViewProps) {
  if (data.counts.total === 0) {
    return (
      <div className={WIDE_PAGE}>
        <ApplicationsHeader data={data} />
        <EmptyState
          title="Aucune candidature pour l'instant"
          description="Parcourez les annonces ouvertes et candidatez en un clic avec un message personnalisé."
          actionLabel="Parcourir les annonces"
          actionHref="/listings"
        />
      </div>
    );
  }

  return (
    <div className={WIDE_PAGE}>
      <ApplicationsHeader data={data} />

      <FilterChips
        ariaLabel="Filtrer les candidatures par statut"
        className="mt-8"
        options={APPLICATION_FILTERS.map((option) => ({
          ...option,
          count: countForBucket(option, data),
        }))}
        value={currentFilter}
        onChange={onFilterChange}
      />

      {/* Only under « Refusées », and only when some situation is non-empty. */}
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

      <div className="mt-6">
        <ApplicationsList
          applications={data.applications}
          grouped={currentFilter === "ALL"}
        />
      </div>

      <Pagination
        currentPage={data.pagination.page}
        totalPages={data.pagination.totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        choices={APPLICATIONS_PAGE_SIZE_CHOICES}
        loading={loading}
        className="mt-6"
      />
    </div>
  );
}

/** The title, and the one figure that matters here: how many still wait on a practice. */
function ApplicationsHeader({ data }: { data: ApplicationsData }) {
  const awaiting = awaitingDecisionCount(data.counts);
  const sent = data.counts.total;

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
          Mes candidatures
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          {sent === 0 ? (
            "Suivez ici l'avancement de chaque candidature envoyée."
          ) : awaiting > 0 ? (
            <>
              <span className="text-foreground tabular-nums">{awaiting}</span>{" "}
              sur {sent} attend{awaiting > 1 ? "ent" : ""} encore une réponse
              d&apos;un cabinet.
            </>
          ) : (
            "Aucune candidature n'attend de réponse."
          )}
        </p>
      </div>
      <Button href="/listings" variant="outline" className="shrink-0">
        Parcourir les annonces
        <ArrowRightIcon className="size-4" />
      </Button>
    </header>
  );
}

/**
 * Whether any situation has rows. « Toutes » is excluded: an erasure settles a
 * rejection without putting it in any of the three.
 */
function hasSituation(data: ApplicationsData): boolean {
  return REJECTION_SITUATIONS.some(
    (option) => option.id !== "ALL" && countForSituation(option.id, data) > 0,
  );
}
