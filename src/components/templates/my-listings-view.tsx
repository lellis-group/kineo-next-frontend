import { SelectPill } from "@/components/atoms/select-pill";
import { EmptyState } from "@/components/molecules/empty-state";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { MyListingsRail } from "@/components/organisms/my-listings-rail";
import {
  MyListingsMobileList,
  MyListingsTable,
} from "@/components/organisms/my-listings-table";
import { BoardShell } from "@/components/templates/board-shell";
import {
  type ListingStatusCounts,
  type ListingsFilter,
  listingFilterBuckets,
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
  const buckets = listingFilterBuckets(counts);

  return (
    <BoardShell rail={<MyListingsRail listings={listings} counts={counts} />}>
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
            <SelectPill
              label="Statut"
              value={currentFilter}
              onChange={onFilterChange}
              options={buckets.map((bucket) => ({
                value: bucket.id,
                label: `${bucket.label} (${bucket.count})`,
              }))}
            />

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
            <EmptyState
              fill
              title="Aucune annonce publiée"
              description="Vous n'avez pas encore d'annonce de remplacement. Publiez-en une pour recevoir des candidatures."
              actionLabel="Publier une annonce"
              actionHref="/listings/new"
            />
          ) : listings.length === 0 ? (
            <EmptyState
              fill
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
    </BoardShell>
  );
}
