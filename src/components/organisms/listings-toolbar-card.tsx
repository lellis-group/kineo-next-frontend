import type { ReactNode } from "react";
import {
  ListingsToolbar,
  type SpecialtyOption,
} from "@/components/molecules/listings-toolbar";
import { cn } from "@/lib/cn";
import type { BrowseFormFilters, BrowseSort } from "@/lib/listings";

/** Shared with the container, which scrolls this card back into view. */
const BROWSE_MAP_ID = "browse-map";

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
  /** The map the row belongs to. Kept as a slot: it can only render in a browser. */
  children: ReactNode;
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
  children,
  className,
}: ListingsToolbarCardProps) {
  return (
    /*
      The `id` is the one thing the container and this card agree on: a posting
      chosen in the list flies the camera, and on a phone that is only worth
      doing if the map comes back into view. See `BROWSE_MAP_ID`.
    */
    <div
      id={BROWSE_MAP_ID}
      className={cn(
        "relative flex min-h-[20rem] flex-1 flex-col sm:min-h-[24rem] lg:min-h-0",
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
        />
      </div>

      {/*
        `flex-1` so the map absorbs whatever height the card is given. From `lg`
        the card is a fixed-height band in the browse shell, so the min-h floors
        below are lifted there (`lg:min-h-0`) — otherwise the map's own minimum
        would overflow the card and push the results table off screen. Below `lg`
        the card is ordinary flow and keeps a usable floor of its own.
      */}
      <div className="order-2 min-h-[22rem] flex-1 sm:min-h-[26rem] lg:min-h-0">
        {children}
      </div>
    </div>
  );
}
