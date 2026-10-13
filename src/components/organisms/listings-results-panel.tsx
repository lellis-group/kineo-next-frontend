import type { Ref } from "react";
import { FileTextIcon } from "@/components/atoms/icons";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { EmptyState } from "@/components/organisms/empty-state";
import { ListingCard } from "@/components/organisms/listing-card";
import {
  ListingsTable,
  type ListingsTableHandle,
} from "@/components/organisms/listings-table";
import { cn } from "@/lib/cn";
import type { BrowseHorizon, BrowseListing } from "@/lib/listings";

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
   * Clears every filter — offered on the filtered empty state as the way out of a
   * search that matched nothing.
   */
  onResetFilters: () => void;
  /** Row the reader is pointing at; mirrored onto its map marker. */
  activeListingId: string | null;
  onActiveListingChange: (id: string | null) => void;
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
  onResetFilters,
  activeListingId,
  onActiveListingChange,
  tableRef,
}: ListingsResultsPanelProps) {
  return (
    <Panel
      fill
      className="lg:flex-1"
      title="Annonces"
      action={
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
          {/*
            Whether a fetch is in flight, said once and reserved: `invisible`
            rather than absent when idle, so the box is taken whether or not this
            panel is refreshing. It has to be reserved because it is one more item
            in a *wrapping* row, and a transient status that comes and goes would
            change the header's height under the reader.

            `invisible` rather than `opacity-0`: an invisible element is out of the
            accessibility tree, so a screen reader is not left with a stale
            « Actualisation… » on a panel that is no longer loading, and still
            hears the one that appears.
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

          {/*
            The reference's trailing control on this card: a track of options with
            the active one filled. Ordering used to live here too, as a labelled
            select — the sort is not a narrowing, so its place is with the row of
            controls that changes no result set. It moved up to the map's own row,
            where « Trier par » reads beside the search it belongs with.

            `min-w-0` stays: `Panel` gives this wrapper the same, and it only
            holds if this div has it as well. As a flex item its default minimum
            is its content's own, and a four-option track is wide — on a phone the
            row ran past the card's edge until the track was told it could shrink.
          */}
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
