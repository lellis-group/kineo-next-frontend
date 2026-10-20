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
 * How the results box takes its height — by giving it back to its rows.
 *
 * From `lg` up the whole page is a full-height shell (`100dvh`, no page scroll),
 * so this box is `flex-1 min-h-0`: it absorbs whatever the map card above it
 * leaves, and the table frame inside it is `flex-1` in turn, so the box's spare
 * room falls *inside* the frame, under its rows, and the pager — a direct child
 * of the panel, after this box — stays at the card's foot instead of drifting
 * across the void (the browse table's own note, and the same decision). That is
 * what lets ten rows and three rows be the same panel without the panel
 * deciding a height of its own.
 *
 * Below `lg` the screen is ordinary document flow, and the box carries no floor:
 * there is no bounded height to fill, so the panel hugs the rows and the pager
 * follows them. The `min-h` this used to keep existed to give the box a shape of
 * its own, and it was exactly the shape of the feature — a region of empty
 * surface between the last row and the pager, on every screen short pages are
 * short on.
 */
const RESULTS_BOX = "lg:min-h-0 lg:flex-1";

/**
 * The dimming a fetch in flight puts over the rows.
 *
 * Declared unconditionally, not on the loading branch only: a `transition-*`
 * class added at the same moment as the opacity it animates has nothing to
 * transition *from*, so the list would go dim instantly and then fade back in on
 * its own. Both states need the class for the pair to interpolate.
 *
 * It is a value rather than markup because the two presentations below are now
 * siblings rather than two children of one wrapper — see the note at the list.
 */
const REFRESHING = "transition-opacity duration-200 ease-out";

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
  /** Reports the row under the pointer to the map's preview state. */
  onHoveredChange?: (id: string | null) => void;
  /**
   * The posting the reader has chosen, and the way to choose another.
   *
   * Passed straight through to the table, which owns the row markup: a choice is
   * made by the title button, and the map half of the screen acts on it.
   */
  selectedListingId?: string | null;
  onListingSelect?: (listing: BrowseListing) => void;
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
  onHoveredChange,
  selectedListingId,
  onListingSelect,
  onResetFilters,
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
          <>
            {/*
              The two presentations are siblings, each one told how it takes its
              height, where they used to sit inside a wrapper that put a single
              `sm:h-full` on both.

              That wrapper was the empty space under a short page. `h-full` is not
              "as tall as you need", it is "as tall as the box" — so the table's
              frame was drawn down to the bottom of the panel whatever the row
              count, and a page of two rows was a bordered box with an empty
              lower half.

              Flattening them is what lets the fix work. A frame that is a
              *direct* child of the results box is a flex item of it, and a flex
              item sizes itself to its content and only shrinks if it has to —
              which is exactly « short page, no scroll; long page, scroll
              inside ». Bevel the frame behind a wrapper div and that wrapper
              becomes the flex item instead: it would have to carry the
              `min-h-0` that lets the chain reach the frame at all, and the extra
              link is one more thing to keep in step. So the refresh dimming goes
              on the presentations themselves — which is where it belongs anyway,
              it is a property of the rows and not of a box that held them.
            */}
            <ul
              className={cn(
                REFRESHING,
                "flex flex-col gap-3 sm:hidden",
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
                  />
                </li>
              ))}
            </ul>

            <ListingsTable
              ref={tableRef}
              listings={listings}
              className={cn(
                REFRESHING,
                loading && "opacity-60",
                "sm:min-h-0 lg:flex-1",
              )}
              onHoveredChange={onHoveredChange}
              selectedListingId={selectedListingId}
              onListingSelect={onListingSelect}
            />
          </>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        loading={loading}
        /*
          Tighter than the flow margin, for the reason `Pagination` states in
          its `className` note and the same the mine table's pager carries: the
          table frame above is a bordered region, and at `lg` its edge is the
          boundary this row reads against — `mt-8` there is one step of air
          repeated on one edge.
        */
        className="mt-3 lg:mt-4"
      />
    </Panel>
  );
}
