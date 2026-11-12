import type { ReactNode } from "react";
import type { SpecialtyOption } from "@/components/molecules/listings-filter-popover";
import { ListingsToolbar } from "@/components/organisms/listings-toolbar";
import { cn } from "@/lib/cn";
import {
  BROWSE_MAP_ID,
  type BrowseFormFilters,
  type BrowseLayout,
  type BrowseSort,
} from "@/lib/listings";
import { MAP_TOP_OVERLAY_ATTRIBUTE } from "@/lib/map/popup-fit";

interface ListingsToolbarCardProps {
  filters: BrowseFormFilters;
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  specialties: readonly SpecialtyOption[];
  total: number;
  filtered: boolean;
  onResetFilters: () => void;
  sort: BrowseSort;
  onSortChange: (sort: BrowseSort) => void;
  layout: BrowseLayout;
  onLayoutChange: (layout: BrowseLayout) => void;
  /** The map, as a slot: it can only render in a browser. */
  children: ReactNode;
  /**
   * « Liste seule »: the bar stays (it holds the layout switch), the map and
   * its reserved height go.
   */
  hideMap?: boolean;
  /** The parent sizes the card; below `lg` this carries a usable floor. */
  className?: string;
}

/** The filter bar, and the map it belongs to. */
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
    // `id`: see `BROWSE_MAP_ID`. `relative` anchors the « Filtres » popover.
    <div
      id={BROWSE_MAP_ID}
      className={cn(
        "relative flex flex-col",
        !hideMap &&
          "min-h-[20rem] flex-1 sm:min-h-[24rem] lg:min-h-0 lg:flex-[4]",
        className,
      )}
    >
      {/*
        From `xl`, over a map, the bar floats on its top-left as white pills
        (pointer passes through the gaps). Below `xl`, and without a map, it
        stays a bar above: narrower maps would be covered by wrapped pills.
      */}
      <div
        // Map popups open below this strip — see `freeArea`.
        {...{ [MAP_TOP_OVERLAY_ATTRIBUTE]: hideMap ? undefined : "" }}
        className={cn(
          "order-1 z-10 mb-3 rounded-card border border-border bg-surface p-2 shadow-[var(--shadow-card)]",
          !hideMap &&
            "xl:pointer-events-none xl:absolute xl:top-3 xl:right-16 xl:left-3 xl:mb-0 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none",
        )}
      >
        <ListingsToolbar
          onMap={!hideMap}
          className={hideMap ? undefined : "xl:[&>*]:pointer-events-auto"}
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

      {/* From `lg` the min-h floors are lifted so the map fits the band. */}
      {!hideMap && (
        <div className="order-2 min-h-[22rem] flex-1 sm:min-h-[26rem] lg:min-h-0">
          {children}
        </div>
      )}
    </div>
  );
}
