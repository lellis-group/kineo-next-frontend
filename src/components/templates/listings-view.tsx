import type { ComponentProps, ReactNode } from "react";
import { ListingsFacetsRail } from "@/components/organisms/listings-facets-rail";
import { ListingsResultsPanel } from "@/components/organisms/listings-results-panel";
import { ListingsToolbarCard } from "@/components/organisms/listings-toolbar-card";
import { BoardShell } from "@/components/templates/board-shell";
import type { BrowseLayout } from "@/lib/listings";

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
    <BoardShell rail={<ListingsFacetsRail {...rail} />}>
      {/* Map and results share the column 4:5; both may shrink. */}
      <ListingsToolbarCard {...toolbar} hideMap={!showMap}>
        {map}
      </ListingsToolbarCard>

      {showList && <ListingsResultsPanel {...results} />}
    </BoardShell>
  );
}
