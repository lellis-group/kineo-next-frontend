import type { Ref } from "react";
import { FileTextIcon } from "@/components/atoms/icons";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { EmptyState } from "@/components/organisms/empty-state";
import { ListingCard } from "@/components/organisms/listing-card";
import { ListingsTable } from "@/components/organisms/listings-table";
import { cn } from "@/lib/cn";
import type {
  BrowseHorizon,
  BrowseListing,
  ListingSpotlight,
  ListingsTableHandle,
} from "@/lib/listings";

interface BrowseHorizonOption {
  id: BrowseHorizon;
  label: string;
}

const BROWSE_HORIZONS: readonly BrowseHorizonOption[] = [
  { id: "ALL", label: "Toutes" },
  { id: "WEEK", label: "Cette semaine" },
  { id: "MONTH", label: "Ce mois" },
  { id: "LATER", label: "Plus tard" },
];

/**
 * From `lg` the page is a full-height shell, so the box absorbs what the map
 * leaves and the spare room falls inside the table frame, keeping the pager at
 * the card's foot. Below `lg` it hugs its rows.
 */
const RESULTS_BOX = "lg:min-h-0 lg:flex-1";

/**
 * Declared on both states: a transition class added together with the opacity
 * it animates has nothing to transition from.
 */
const REFRESHING = "transition-opacity duration-200 ease-out";

interface ListingsResultsPanelProps {
  listings: BrowseListing[];
  total: number;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  filtered: boolean;
  horizon: BrowseHorizon;
  onHorizonChange: (horizon: BrowseHorizon) => void;
  onResetFilters: () => void;
  onHoveredChange?: (id: string | null) => void;
  selectedListingId?: string | null;
  onListingSelect?: (listing: BrowseListing) => void;
  spotlight?: ListingSpotlight | null;
  /** What a screen reader hears after a pick, page turn included. */
  announcement?: string;
  /** Nonce of a pick that changed page — drives the pager's flash. */
  pageHighlight?: number | null;
  tableRef?: Ref<ListingsTableHandle>;
}

/**
 * The results: the period row, the rows (cards or table, one removed by CSS),
 * and the pager.
 */
export function ListingsResultsPanel({
  listings,
  total,
  totalPages,
  page,
  onPageChange,
  loading,
  filtered,
  horizon,
  onHorizonChange,
  onHoveredChange,
  selectedListingId,
  onListingSelect,
  spotlight,
  announcement,
  pageHighlight,
  onResetFilters,
  tableRef,
}: ListingsResultsPanelProps) {
  return (
    <Panel
      fill
      className="lg:flex-[5]"
      title={
        <>
          Annonces <span className="text-muted tabular-nums">{total}</span>
        </>
      }
      action={
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
          {/*
            Reserved with `invisible` rather than removed, so the wrapping header
            keeps its height; `invisible` also takes it out of the a11y tree.
          */}
          <span
            className={cn(
              "text-xs whitespace-nowrap text-muted",
              !loading && "invisible",
            )}
            aria-live="polite"
          >
            Actualisation…
          </span>

          {/* `min-w-0` lets the track shrink on a phone. */}
          <SegmentedControl
            ariaLabel="Filtrer les annonces par date de début"
            options={BROWSE_HORIZONS}
            value={horizon}
            onChange={onHorizonChange}
          />
        </div>
      }
    >
      {/*
        A size container: cards or table is decided by this panel's width, not
        the screen's. `data-results` scopes the table's `scrollToId`.
      */}
      <div data-results className={cn("@container flex flex-col", RESULTS_BOX)}>
        {/* Kept mounted, so a pick landing on an empty page is announced. */}
        <output className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </output>

        {listings.length === 0 ? (
          <div className="flex flex-1 items-center">
            <EmptyState
              className="mt-0 w-full"
              icon={<FileTextIcon className="h-8 w-8 text-primary" />}
              title={
                filtered
                  ? "Aucune annonce ne correspond à ces filtres"
                  : "Aucune annonce ouverte pour le moment"
              }
              description={
                filtered
                  ? "Élargissez votre recherche en retirant un filtre ou une période."
                  : "Revenez d'ici peu : les cabinets publient leurs remplacements au fil de l'eau."
              }
              actionLabel={filtered ? "Réinitialiser les filtres" : undefined}
              onAction={filtered ? onResetFilters : undefined}
            />
          </div>
        ) : (
          <>
            {/*
              Siblings, not wrapped: the table frame must be a direct flex child
              of the results box to scroll inside it.
            */}
            <ul
              className={cn(
                REFRESHING,
                "flex flex-col gap-3 @md:hidden",
                loading && "opacity-60",
              )}
            >
              {listings.map((listing, index) => (
                <li key={listing.id}>
                  <ListingCard
                    listing={listing}
                    index={index}
                    selectedListingId={selectedListingId}
                    onListingSelect={onListingSelect}
                    spotlight={spotlight}
                  />
                </li>
              ))}
            </ul>

            <ListingsTable
              ref={tableRef}
              listings={listings}
              className={cn(REFRESHING, loading && "opacity-60", "lg:flex-1")}
              onHoveredChange={onHoveredChange}
              selectedListingId={selectedListingId}
              onListingSelect={onListingSelect}
              spotlight={spotlight}
            />
          </>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        loading={loading}
        highlight={pageHighlight}
        className="mt-3 lg:mt-4"
      />
    </Panel>
  );
}
