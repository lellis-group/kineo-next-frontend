import {
  ChevronDownIcon,
  FileTextIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { EmptyState } from "@/components/organisms/empty-state";
import { MyListingsRail } from "@/components/organisms/my-listings-rail";
import {
  MyListingsMobileList,
  MyListingsTable,
} from "@/components/organisms/my-listings-table";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";
import {
  countForFilter,
  LISTING_FILTERS,
  type ListingStatusCounts,
  type ListingsFilter,
  type MyListing,
} from "@/lib/listings";
import {
  MY_LISTINGS_PAGE_SIZE_CHOICES,
  type MyListingsPageSize,
} from "@/lib/page-size";

const URGENCY_OPTIONS = [
  { id: "ALL", label: "Toutes" },
  { id: "URGENT", label: "Urgentes" },
] as const;

export interface MyListingsViewProps {
  listings: MyListing[];
  counts: ListingStatusCounts;
  currentFilter: ListingsFilter;
  onFilterChange: (filter: ListingsFilter) => void;
  urgentOnly: boolean;
  onUrgentToggle: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: MyListingsPageSize;
  onPageSizeChange: (size: MyListingsPageSize) => void;
  loading: boolean;
}

/** The same full-height shell as the browse feed; document flow below `lg`. */
const SHELL = cn(
  SITE_SHELL,
  "flex flex-col gap-4 py-4",
  "lg:h-full lg:min-h-0 lg:flex-1 lg:gap-3 lg:py-3",
);

/**
 * The practice's board: a rail of summary panels, and one card whose table
 * scrolls inside it so the page doesn't.
 */
export function MyListingsView({
  listings,
  counts,
  currentFilter,
  onFilterChange,
  urgentOnly,
  onUrgentToggle,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  loading,
}: MyListingsViewProps) {
  const buckets = LISTING_FILTERS.map((option) => ({
    id: option.id,
    label: option.label,
    count: countForFilter(option, counts),
  }));

  return (
    <div className={SHELL}>
      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[22.5rem_minmax(0,1fr)] lg:gap-3">
        <div className="scrollbar-quiet order-2 lg:order-1 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-1">
          <MyListingsRail listings={listings} counts={counts} />
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2 lg:min-h-0 lg:flex-1">
          <Panel
            fill
            className="lg:flex-1"
            title={
              <>
                Mes offres{" "}
                <span className="text-muted tabular-nums">{counts.total}</span>
              </>
            }
            action={
              // Urgency is orthogonal to status, so it is its own toggle.
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <label className="flex shrink-0 cursor-pointer items-center rounded-full border border-border py-1.5 pr-1.5 pl-3.5 transition-colors hover:border-border-strong has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring">
                  <span className="text-control whitespace-nowrap text-muted">
                    Statut
                  </span>
                  <span className="relative">
                    <select
                      value={currentFilter}
                      onChange={(event) =>
                        onFilterChange(event.target.value as ListingsFilter)
                      }
                      className="cursor-pointer appearance-none bg-transparent py-0 pr-5 pl-1.5 text-control font-medium whitespace-nowrap text-foreground focus:outline-none [&_option]:bg-surface [&_option]:text-foreground"
                    >
                      {buckets.map((bucket) => (
                        <option key={bucket.id} value={bucket.id}>
                          {bucket.label} ({bucket.count})
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2 text-muted" />
                  </span>
                </label>

                <SegmentedControl
                  ariaLabel="Filtrer par urgence"
                  options={URGENCY_OPTIONS}
                  value={urgentOnly ? "URGENT" : "ALL"}
                  onChange={(next) => {
                    if ((next === "URGENT") !== urgentOnly) onUrgentToggle();
                  }}
                />
              </div>
            }
          >
            {/*
              Table and mobile list, one removed by CSS. At `lg` the region
              takes the card's height so the pager stays at its foot.
            */}
            <div className="flex flex-col lg:min-h-0 lg:flex-1">
              {counts.total === 0 ? (
                <div className="flex flex-1 items-center">
                  <EmptyState
                    className="mt-0 w-full"
                    icon={<FileTextIcon className="h-8 w-8 text-primary" />}
                    title="Aucune annonce publiée"
                    description="Vous n'avez pas encore d'annonce de remplacement. Publiez-en une pour recevoir des candidatures."
                    actionLabel="Publier une annonce"
                    actionHref="/listings/new"
                  />
                </div>
              ) : listings.length === 0 ? (
                <div className="flex flex-1 items-center">
                  <EmptyState
                    className="mt-0 w-full"
                    icon={<UsersIcon className="h-8 w-8 text-primary" />}
                    title="Aucune annonce dans cette catégorie"
                    description={
                      urgentOnly
                        ? "Aucune annonce urgente dans cette catégorie. Retirez le filtre « Urgentes » pour voir les autres."
                        : "Changez de filtre pour voir vos autres annonces."
                    }
                    actionLabel={
                      urgentOnly ? "Retirer le filtre Urgentes" : undefined
                    }
                    onAction={urgentOnly ? onUrgentToggle : undefined}
                  />
                </div>
              ) : (
                <>
                  <MyListingsTable listings={listings} />

                  <MyListingsMobileList listings={listings} />
                </>
              )}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              pageSize={pageSize}
              onPageSizeChange={onPageSizeChange}
              choices={MY_LISTINGS_PAGE_SIZE_CHOICES}
              loading={loading}
              className="mt-3 lg:mt-4"
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
