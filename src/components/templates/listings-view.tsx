import type { ComponentProps, ReactNode } from "react";
import { ListingsFacetsRail } from "@/components/organisms/listings-facets-rail";
import { ListingsResultsPanel } from "@/components/organisms/listings-results-panel";
import { ListingsToolbarCard } from "@/components/organisms/listings-toolbar-card";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";
import type { BrowseLayout } from "@/lib/listings";

/**
 * One screenful from `lg` up, no page scroll; ordinary document flow below.
 */
const SHELL = cn(
  SITE_SHELL,
  "flex flex-col gap-4 py-4",
  "lg:h-full lg:min-h-0 lg:gap-3 lg:py-3",
);

// Read off the sections themselves, so the layout's props can't drift.
// `children` is omitted: the map is the layout's slot.
type ResultsProps = ComponentProps<typeof ListingsResultsPanel>;
type ToolbarProps = Omit<
  ComponentProps<typeof ListingsToolbarCard>,
  "children"
>;
type RailProps = ComponentProps<typeof ListingsFacetsRail>;

export interface ListingsViewProps {
  rail: RailProps;
  results: ResultsProps;
  toolbar: ToolbarProps;
  /** A slot because it can only be rendered in a browser. */
  map: ReactNode;
  layout: BrowseLayout;
}

/**
 * The browse screen's layout. The filter bar shows in every layout (it holds
 * the layout switch), so the card can show the bar without the map
 * (`hideMap`).
 */
export function ListingsView({
  rail,
  results,
  toolbar,
  map,
  layout,
}: ListingsViewProps) {
  const showMap = layout !== "list";
  const showList = layout !== "map";

  return (
    <div className={SHELL}>
      {/*
        From `lg`: rail on the left (scrolling on its own), map over results on
        the right. Below: map and results first, then the rail.
      */}
      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[22.5rem_minmax(0,1fr)] lg:gap-3">
        <div className="scrollbar-quiet order-2 lg:order-1 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-1">
          <ListingsFacetsRail {...rail} />
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2 lg:min-h-0 lg:flex-1">
          {/* Map and results share the column 4:5; both may shrink. */}
          <ListingsToolbarCard {...toolbar} hideMap={!showMap}>
            {map}
          </ListingsToolbarCard>

          {showList && <ListingsResultsPanel {...results} />}
        </div>
      </div>
    </div>
  );
}
