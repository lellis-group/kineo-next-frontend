import type { ReactNode } from "react";
import {
  ListingsToolbar,
  type SpecialtyOption,
} from "@/components/molecules/listings-toolbar";
import { cn } from "@/lib/cn";
import {
  BROWSE_MAP_ID,
  type BrowseFormFilters,
  type BrowseLayout,
  type BrowseSort,
} from "@/lib/listings";

interface ListingsToolbarCardProps {
  filters: BrowseFormFilters;
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  specialties: readonly SpecialtyOption[];
  /** Result count under the active filters, for the summary line. */
  total: number;
  /** True on any filtered, non-default view — drives the reset affordance. */
  filtered: boolean;
  onResetFilters: () => void;
  /** Ordering, and its change handler. */
  sort: BrowseSort;
  onSortChange: (sort: BrowseSort) => void;
  /** Which halves are shown, and its change handler. Passed through to the bar. */
  layout: BrowseLayout;
  onLayoutChange: (layout: BrowseLayout) => void;
  /** The map the row belongs to. Kept as a slot: it can only render in a browser. */
  children: ReactNode;
  /**
   * True in the « Liste seule » layout: the bar stays, the map goes.
   *
   * The bar carries the switch that chooses this layout, so it can never be the
   * thing the layout hides — a reader who collapsed to the list would have no way
   * back. Hiding only the map, and only its slot, is what keeps the bar reachable
   * in every mode. The wrapper also drops its `flex-1` and its map-sized `min-h`,
   * so the bar takes only its own height and the list below claims the rest —
   * otherwise an empty `flex-1` would reserve half the screen for a map that is
   * not drawn.
   */
  hideMap?: boolean;
  /**
   * Height and width the layout hands the card.
   *
   * The card no longer decides how tall it is: from `lg` up it sits in a
   * full-height shell beside the facets rail and above the results table, and the
   * page's height is the viewport's — so a fixed `min-h` here would either waste
   * the space the table needs or push the table off screen. The parent sizes it;
   * the map simply fills whatever height results. Below `lg` the class carries a
   * usable floor of its own, since there the card is ordinary document flow.
   */
  className?: string;
}

/**
 * The filter bar, and the map it belongs to.
 *
 * An organism: a row of controls and a map, arranged so the controls sit *above*
 * the map. That arrangement lives here rather than in the page's layout because it
 * is a property of this pair — move the two apart and the bar is just a box of
 * inputs.
 *
 * The bar is in the flow, on the card's own surface, rather than floating over
 * the map: that is the reference's arrangement, where the search and the sort sit
 * on a band above the tiles with the card's surface behind them. A floating strip
 * has to be opaque enough to read over streets and inset from every edge to stay
 * clear of the map's own controls, and the two rules together are what made this
 * bar three rows deep on a narrow map.
 */
export function ListingsToolbarCard({
  filters,
  onFiltersChange,
  specialties,
  total,
  filtered,
  onResetFilters,
  sort,
  onSortChange,
  layout,
  onLayoutChange,
  children,
  hideMap = false,
  className,
}: ListingsToolbarCardProps) {
  return (
    /*
      The `id` is the one thing the container and this card agree on: a posting
      chosen in the list flies the camera, and on a phone that is only worth
      doing if the map comes back into view. See `BROWSE_MAP_ID`.

      `flex-1` and the map-sized `min-h` describe a card that carries a map. In
      « Liste seule » there is no map, so the card is just the bar: it drops both
      and takes only the height the bar needs, leaving the rest of the column to
      the list. `relative` is kept either way — the « Filtres » popover is
      positioned against this card whichever layout is showing.
    */
    <div
      id={BROWSE_MAP_ID}
      className={cn(
        "relative flex flex-col",
        !hideMap && "min-h-[20rem] flex-1 sm:min-h-[24rem] lg:min-h-0",
        className,
      )}
    >
      <div className="order-1 z-10 mb-3 rounded-card border border-border bg-surface p-2 shadow-[var(--shadow-card)]">
        <ListingsToolbar
          filters={filters}
          onFiltersChange={onFiltersChange}
          specialties={specialties}
          total={total}
          filtered={filtered}
          onResetFilters={onResetFilters}
          sort={sort}
          onSortChange={onSortChange}
          layout={layout}
          onLayoutChange={onLayoutChange}
        />
      </div>

      {/*
        `flex-1` so the map absorbs whatever height the card is given. From `lg`
        the card is a fixed-height band in the browse shell, so the min-h floors
        below are lifted there (`lg:min-h-0`) — otherwise the map's own minimum
        would overflow the card and push the results table off screen. Below `lg`
        the card is ordinary flow and keeps a usable floor of its own.

        Not rendered at all in « Liste seule »: an empty map-sized box would
        reserve half the screen for a canvas that is not drawn.
      */}
      {!hideMap && (
        <div className="order-2 min-h-[22rem] flex-1 sm:min-h-[26rem] lg:min-h-0">
          {children}
        </div>
      )}
    </div>
  );
}
