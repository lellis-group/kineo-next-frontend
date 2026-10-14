import type { ComponentProps, ReactNode } from "react";
import { ListingsFacetsRail } from "@/components/organisms/listings-facets-rail";
import { ListingsResultsPanel } from "@/components/organisms/listings-results-panel";
import { ListingsToolbarCard } from "@/components/organisms/listings-toolbar-card";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";
import type { BrowseFacets, BrowseLayout } from "@/lib/listings";

/**
 * The browse screen's shell — one screenful, no page scroll from `lg` up.
 *
 * The page is a fixed-height region (`main` in the site layout is `flex-1
 * min-h-0 overflow-y-auto`, and this fills it): the facets rail on the left and,
 * on the right, the map card over the results table, both sized by the height
 * the shell has rather than by their content. `py` is kept to a minimum and the
 * max width is widened past the console default — the point of this screen is to
 * show as much of the collection at once as the window allows, and every spare
 * pixel of padding or margin is a row the reader has to scroll for.
 *
 * Below `lg` none of that holds: there is no height to fill and the rail would
 * sit beside a squeezed map, so it is ordinary document flow — rail first, then
 * the map and table — and the page scrolls as a page should.
 */
const SHELL = cn(
  SITE_SHELL,
  "flex flex-col gap-4 py-4",
  "lg:h-full lg:min-h-0 lg:gap-3 lg:py-3",
);

/**
 * The props each section takes, read off the section itself.
 *
 * `ComponentProps` rather than a hand-written mirror: a duplicated interface is
 * free to drift from the component it describes, and the drift only shows up as
 * a type error somewhere else entirely. This way, adding a prop to a section is
 * a one-line change and the layout's interface follows.
 *
 * `children` is omitted because the map is not part of the card's own interface —
 * it is the layout's slot. Leaving it in would mean the layout had to supply it
 * twice, once as a prop and once as a child, and the two could disagree.
 */
type ResultsProps = ComponentProps<typeof ListingsResultsPanel>;
type ToolbarProps = Omit<
  ComponentProps<typeof ListingsToolbarCard>,
  "children"
>;

export interface ListingsViewProps {
  /** The three panels down the left. */
  facets: BrowseFacets;
  /** Everything the results section needs, passed straight through. */
  results: ResultsProps;
  /** Everything the filter card needs, passed straight through. */
  toolbar: ToolbarProps;
  /** The map. A slot because it can only be rendered in a browser. */
  map: ReactNode;
  /** Which halves are on screen. Drives what this layout shows, nothing else. */
  layout: BrowseLayout;
}

/**
 * The browse screen's layout, and nothing else.
 *
 * A template: it positions three sections and owns no behaviour. Its props are
 * sections, not a flat list of everything the page shows — a layout told about
 * date ranges and pager state is a layout that breaks the first time a section
 * changes. Each section takes its own narrow props instead.
 *
 * The rail stacks above the map below `lg` rather than beside it: three panels
 * at the column width is fine, three at phone width would push the map — the
 * reason the screen exists — entirely off the first screenful.
 *
 * The layout prop decides which of the two right-hand sections show. `split`
 * (the desktop default) is map-over-list, each about half the height; `list`
 * drops the map so the whole height goes to the rows; `map` drops the list so it
 * all goes to the map. The filter bar stays in every mode — it is where the
 * switch itself lives, so hiding it with the map would leave a `list` reader
 * with no way back. That is why the bar and the map are one section that can
 * show the bar without the map (`hideMap`), rather than the map hiding the bar
 * with it.
 */
export function ListingsView({
  facets,
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
        The whole screen is one grid from `lg` up: the facets rail takes the left
        column and scrolls on its own, and the right column is the map card over
        the results table — both stretched to the shell's height so nothing runs
        off the bottom of the window. Below `lg` it collapses to a single column
        in reading order (rail, then map + table) and scrolls as a page.
      */}
      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-3">
        <div className="order-2 lg:order-1 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-1">
          <ListingsFacetsRail facets={facets} />
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2 lg:min-h-0 lg:flex-1">
          {/*
            The map card and the results panel share the column's height, map
            first — the proportions the reference dashboard uses, where the map
            is the large element on the right rather than a thin strip. Both are
            `flex-1` (the card's base class carries it, `lg:min-h-0` lets it
            shrink), so they split the space ~50/50 and the table scrolls inside
            its own region. A fixed height here would pin the map small and hand
            the rest to the table, which is the opposite of the reference.

            The reset row that used to sit between the two is gone, and on the
            reference's own evidence: its screen has no line of chrome under the
            map. The reset now lives where the filters it clears are — inside
            « Filtres », which also says how many of them are applied.
          */}
          <ListingsToolbarCard {...toolbar} hideMap={!showMap}>
            {map}
          </ListingsToolbarCard>

          {showList && <ListingsResultsPanel {...results} />}
        </div>
      </div>
    </div>
  );
}
