import Link from "next/link";
import { SearchIcon } from "@/components/atoms/icons";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterChips } from "@/components/molecules/filter-chips";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import {
  ApplicationsMobileList,
  ApplicationsTable,
} from "@/components/organisms/applications-table";
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
import { SITE_SHELL } from "@/lib/layout";
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

/**
 * /applications: one console panel holding the table — the status filters
 * in its header, the journey of each application in its rows, the pager at
 * its foot.
 */
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
  const hasAny = data.counts.total > 0;
  const awaiting = awaitingDecisionCount(data.counts);

  return (
    <div className={`${SITE_SHELL} py-4 lg:py-6`}>
      <Panel
        title={
          <>
            Mes candidatures{" "}
            <span className="text-muted tabular-nums">{data.counts.total}</span>
          </>
        }
        action={
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {hasAny && (
              <FilterChips
                ariaLabel="Filtrer les candidatures par statut"
                options={APPLICATION_FILTERS.map((option) => ({
                  ...option,
                  count: countForBucket(option, data),
                }))}
                value={currentFilter}
                onChange={onFilterChange}
              />
            )}
            <Link
              href="/listings"
              aria-label="Parcourir les annonces"
              title="Parcourir les annonces"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-border-strong text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <SearchIcon className="size-4" />
            </Link>
          </div>
        }
      >
        {!hasAny ? (
          <EmptyState
            fill
            title="Aucune candidature pour l'instant"
            description="Parcourez les annonces ouvertes et candidatez en un clic avec un message personnalisé."
            actionLabel="Parcourir les annonces"
            actionHref="/listings"
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {awaiting > 0 ? (
                  <>
                    <span className="text-foreground tabular-nums">
                      {awaiting}
                    </span>{" "}
                    attend{awaiting > 1 ? "ent" : ""} encore une réponse
                    d&apos;un cabinet.
                  </>
                ) : (
                  "Aucune candidature n'attend de réponse."
                )}
              </p>

              {/* Only under « Refusées », and only when some situation is non-empty. */}
              {currentFilter === "REFUSED" && hasSituation(data) && (
                <FilterChips
                  ariaLabel="Filtrer les candidatures refusées par situation"
                  options={REJECTION_SITUATIONS.map((option) => ({
                    ...option,
                    count: countForSituation(option.id, data),
                  }))}
                  value={currentSituation}
                  onChange={onSituationChange}
                />
              )}
            </div>

            {data.applications.length === 0 ? (
              <EmptyState
                fill
                title="Aucune candidature dans ce statut"
                description="Changez de filtre pour voir vos autres candidatures."
              />
            ) : (
              <>
                <ApplicationsTable
                  applications={data.applications}
                  grouped={currentFilter === "ALL"}
                />
                <ApplicationsMobileList applications={data.applications} />
              </>
            )}

            <Pagination
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={onPageChange}
              pageSize={pageSize}
              onPageSizeChange={onPageSizeChange}
              choices={APPLICATIONS_PAGE_SIZE_CHOICES}
              loading={loading}
              className="mt-3 lg:mt-4"
            />
          </>
        )}
      </Panel>
    </div>
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
