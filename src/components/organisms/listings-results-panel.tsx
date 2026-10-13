import type { Ref } from "react";
import { FileTextIcon } from "@/components/atoms/icons";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { Select } from "@/components/molecules/select";
import { EmptyState } from "@/components/organisms/empty-state";
import { ListingCard } from "@/components/organisms/listing-card";
import {
  ListingsTable,
  type ListingsTableHandle,
} from "@/components/organisms/listings-table";
import { cn } from "@/lib/cn";
import type { BrowseHorizon, BrowseListing, BrowseSort } from "@/lib/listings";

/**
 * How the reader wants the rows ordered — the labels for the sort picker.
 *
 * The `BrowseSort` union itself lives in the domain (`lib/listings`): ordering is
 * a real parameter the endpoint takes, so the set of values belongs with the
 * contracts, not with a component. What stays here is the French copy, which is
 * presentation and belongs beside the `<Select>` that renders it.
 *
 * It sits with the results rather than with the filter bar because sorting is not
 * a narrowing: it changes no result set, only which row comes first. A reader who
 * changes it expects the list below to rearrange, not the set of results to shrink.
 */
interface BrowseSortOption {
  id: BrowseSort;
  label: string;
}

const BROWSE_SORTS: readonly BrowseSortOption[] = [
  { id: "recent", label: "Plus récentes" },
  { id: "urgent", label: "Urgentes d'abord" },
  { id: "startDate", label: "Date de début" },
];

interface BrowseHorizonOption {
  id: BrowseHorizon;
  label: string;
}

/** Period row labels, beside the `SegmentedControl` that renders them. */
const BROWSE_HORIZONS: readonly BrowseHorizonOption[] = [
  { id: "ALL", label: "Toutes" },
  { id: "WEEK", label: "Cette semaine" },
  { id: "MONTH", label: "Ce mois" },
  { id: "LATER", label: "Plus tard" },
];

/**
 * How the results box takes its height — and it is no longer a fixed dimension.
 *
 * From `lg` up the whole page is a full-height shell (`100dvh`, no page scroll),
 * so this box is `flex-1 min-h-0`: it absorbs whatever the map card above it
 * leaves, and the table scrolls inside it. That is what lets ten rows and three
 * rows be the same panel without the panel deciding a height of its own — the
 * fixed `clamp` this replaces existed only because the box used to have to guess.
 *
 * Below `lg` the screen is ordinary document flow: there is no bounded height to
 * fill, so the box keeps a floor of its own (`min-h`) and the page scrolls as a
 * page should. `sm:` and not below — under 640px this is `ListingCard`, and a
 * card-sized list is not a scrolled region.
 */
const RESULTS_BOX = "min-h-[20rem] sm:min-h-[24rem] lg:min-h-0 lg:flex-1";

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
  /**
   * Clears every filter — offered on the filtered empty state as the way out of a
   * search that matched nothing.
   */
  onResetFilters: () => void;
  /**
   * A handle onto the table, so the screen can scroll a picked posting into
   * view. Passed down rather than reached for: the table owns the row markup,
   * so it — not the container — is what knows how to find a row by id.
   */
  tableRef?: Ref<ListingsTableHandle>;
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
  onResetFilters,
  tableRef,
}: ListingsResultsPanelProps) {
  return (
    <Panel
      fill
      className="lg:flex-1"
      title="Annonces disponibles"
      action={
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/*
            Rendered whether or not a fetch is in flight, and hidden with
            `invisible` rather than absent when idle — `invisible` reserves the
            box, `display:none` would not.

            It has to be here at all, and it has to be reserved, because it is
            one more item in a *wrapping* row (`Panel`'s header is `flex-wrap`,
            and so is this one). The status is ~97px wide once its gap is
            counted, and past a certain viewport width that is exactly what
            pushes the whole action block off the title's line and onto a second
            one — the panel then grew 28px at 1024 and 960, and 53px at 820,
            only to shrink back when the response landed. The height of a panel
            is not something a transient status gets to decide.

            `invisible` rather than `opacity-0` for the same reason: an
            invisible element is out of the accessibility tree, so a screen
            reader is not left with a stale « Actualisation… » on a panel that is
            no longer loading, and still hears the one that appears.
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

          <label
            className="text-xs whitespace-nowrap text-muted"
            htmlFor="browse-sort"
          >
            Trier par
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
      <div className={cn("flex flex-col", RESULTS_BOX)}>
        {listings.length === 0 ? (
          /*
           * Centred in the box rather than left at its own height, so that a
           * search matching nothing is the same size as a search matching ten
           * postings: the panel's dimensions do not depend on what is in it.
           */
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
          <div
            /*
             * The transition is declared unconditionally, not on the loading
             * branch only: a `transition-*` class added at the same moment as the
             * opacity it animates has nothing to transition *from*, so the list
             * would go dim instantly and then fade back in on its own. Both
             * states need the class for the pair to interpolate.
             */
            className={cn(
              "transition-opacity duration-200 ease-out sm:h-full",
              loading && "opacity-60",
            )}
          >
            <div className="sm:hidden">
              <ul className="flex flex-col gap-3">
                {listings.map((listing, index) => (
                  <li key={listing.id}>
                    <ListingCard listing={listing} index={index} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden sm:block sm:h-full">
              <ListingsTable
                ref={tableRef}
                listings={listings}
                activeListingId={activeListingId}
                onActiveListingChange={onActiveListingChange}
              />
            </div>
          </div>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        loading={loading}
      />
    </Panel>
  );
}
