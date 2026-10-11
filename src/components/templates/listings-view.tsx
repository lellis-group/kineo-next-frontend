import type { ComponentProps, ReactNode } from "react";
import { SlidersIcon } from "@/components/atoms/icons";
import { PageHeader } from "@/components/atoms/page-header";
import { ListingsFacetsRail } from "@/components/organisms/listings-facets-rail";
import { ListingsResultsPanel } from "@/components/organisms/listings-results-panel";
import { ListingsToolbarCard } from "@/components/organisms/listings-toolbar-card";
import { PAGE_CONTAINER } from "@/lib/layout";
import type { BrowseFacets } from "@/lib/listings";

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
  /** True on any filtered, non-default view — drives the reset affordance. */
  filtered: boolean;
  onResetFilters: () => void;
}

/**
 * The browse screen's layout, and nothing else.
 *
 * A template: it positions four sections and owns no behaviour. Its props are
 * sections, not a flat list of everything the page shows — a layout told about
 * date ranges and pager state is a layout that breaks the first time a section
 * changes. Each section takes its own narrow props instead.
 *
 * The rail stacks above the map below `lg` rather than beside it: three panels
 * at the column width is fine, three at phone width would push the map — the
 * reason the screen exists — entirely off the first screenful.
 */
export function ListingsView({
  facets,
  results,
  toolbar,
  map,
  filtered,
  onResetFilters,
}: ListingsViewProps) {
  return (
    <div className={PAGE_CONTAINER}>
      <PageHeader
        title="Annonces"
        subtitle="Parcourez les remplacements ouverts, filtrez par spécialité, période ou urgence, et situez chaque cabinet sur la carte."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="order-2 lg:order-1">
          <ListingsFacetsRail facets={facets} />
        </div>

        <div className="order-1 flex min-w-0 flex-col lg:order-2">
          <ListingsToolbarCard {...toolbar}>{map}</ListingsToolbarCard>
        </div>
      </div>

      {filtered && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted">
            Filtres appliqués à cette recherche.
          </p>
          {/*
           * A chip rather than a bare underlined word, so the reset reads as the
           * control it is and gets a real hit area — the same treatment as the
           * « Urgentes » toggle in the filter bar. Compact overrides mirror that
           * button's, minus the `min-h` floor: this row is not aligning against
           * inputs, so the chip's own 3rem is one more button than it needs, and
           * `py-1.5` keeps it the height of the line it sits beside.
           */}
          <button
            type="button"
            className="chip min-h-0 shrink-0 whitespace-nowrap px-3 py-1.5"
            onClick={onResetFilters}
          >
            <SlidersIcon className="mr-1 inline-block size-3.5 align-[-0.15em]" />
            Réinitialiser
          </button>
        </div>
      )}

      <ListingsResultsPanel {...results} />
    </div>
  );
}
