import { FileTextIcon } from "@/components/atoms/icons";
import {
  BROWSE_SORTS,
  type BrowseSort,
} from "@/components/molecules/listings-toolbar";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { Select } from "@/components/molecules/select";
import { EmptyState } from "@/components/organisms/empty-state";
import { ListingCard } from "@/components/organisms/listing-card";
import { ListingsTable } from "@/components/organisms/listings-table";
import type { BrowseHorizon, BrowseListing } from "@/lib/listings";
import { BROWSE_HORIZONS } from "@/lib/listings";

interface ListingsResultsPanelProps {
  listings: BrowseListing[];
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  /** True on a filtered view — what the empty state says about itself. */
  filtered: boolean;
  horizon: BrowseHorizon;
  onHorizonChange: (horizon: BrowseHorizon) => void;
  /**
   * How the rows are ordered.
   *
   * Part of this panel's interface rather than the filter bar's: ordering does not
   * narrow anything, and a reader who changes it expects the list below to
   * rearrange, not the set of results to shrink.
   */
  sort: BrowseSort;
  onSortChange: (sort: BrowseSort) => void;
  /** Row the reader is pointing at; mirrored onto its map marker. */
  activeListingId: string | null;
  onActiveListingChange: (id: string | null) => void;
}

/**
 * The results: the quick period row, the rows themselves, and the pager.
 *
 * An organism — a whole section built out of a panel, a segmented control, cards
 * or a table, and a pager — and it exists as its own component so that this
 * screen's layout never has to know what a "period row" or an "empty state" is.
 *
 * Both presentations are rendered and one is removed by CSS, which is not the
 * same as being hidden: `display:none` also takes it out of the accessibility
 * tree, so a screen reader and a keyboard never meet the copy that is not on
 * screen.
 */
export function ListingsResultsPanel({
  listings,
  totalPages,
  page,
  onPageChange,
  loading,
  filtered,
  horizon,
  onHorizonChange,
  sort,
  onSortChange,
  activeListingId,
  onActiveListingChange,
}: ListingsResultsPanelProps) {
  return (
    <Panel
      className="mt-4"
      title="Annonces disponibles"
      action={
        <div className="flex flex-wrap items-center justify-end gap-3">
          {loading && (
            <span className="text-xs text-muted" aria-live="polite">
              Actualisation…
            </span>
          )}

          <label className="sr-only" htmlFor="browse-sort">
            Trier les annonces par
          </label>
          <Select
            id="browse-sort"
            className="py-1.5"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as BrowseSort)}
          >
            {BROWSE_SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>

          <SegmentedControl
            ariaLabel="Filtrer les annonces par date de début"
            options={BROWSE_HORIZONS}
            value={horizon}
            onChange={onHorizonChange}
          />
        </div>
      }
    >
      {listings.length === 0 ? (
        <EmptyState
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
        />
      ) : (
        <div className={loading ? "opacity-60 transition-opacity" : undefined}>
          <div className="sm:hidden">
            <ul className="flex flex-col gap-3">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} />
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden sm:block">
            <ListingsTable
              listings={listings}
              activeListingId={activeListingId}
              onActiveListingChange={onActiveListingChange}
            />
          </div>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </Panel>
  );
}
