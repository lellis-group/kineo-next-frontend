import type { ReactNode } from "react";
import {
  ListingsToolbar,
  type SpecialtyOption,
} from "@/components/molecules/listings-toolbar";
import type { BrowseFormFilters } from "@/lib/listings";

interface ListingsToolbarCardProps {
  filters: BrowseFormFilters;
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  specialties: readonly SpecialtyOption[];
  /** Result count under the active filters, for the summary line. */
  total: number;
  /** The map the bar floats over. Kept as a slot: it can only render in a browser. */
  children: ReactNode;
}

/**
 * The filter bar, and the map it belongs to.
 *
 * An organism: a card, a group of controls and a map, arranged so the controls
 * sit *over* the map from `sm:` up and above it below that. That behaviour lives
 * here rather than in the page's layout because it is a property of this pair —
 * move the two apart and the bar is just a box of inputs.
 *
 * Below `sm:` the bar sits in the flow. Floating six wrapped rows over a 22rem
 * map would leave the reader a strip of tiles between the controls and the panel
 * below them. One node serves both: two copies would mean two inputs sharing one
 * `id`, and the second would be unreachable rather than merely invisible.
 */
export function ListingsToolbarCard({
  filters,
  onFiltersChange,
  specialties,
  total,
  children,
}: ListingsToolbarCardProps) {
  return (
    <div className="relative flex min-h-[22rem] flex-1 flex-col sm:min-h-[26rem]">
      {/*
        `w-fit max-w-full`, and only `left` — not `inset-x`.

        An absolutely positioned box with both `left` and `right` set takes its
        width from those offsets, so `w-fit` is ignored and the bar stretches
        across the map whatever its content. Fixing the left edge alone lets
        `fit-content` decide the rest, and the width cap keeps it inside the map
        on a narrow screen.
      */}
      <div className="order-1 z-10 mb-3 w-fit max-w-[calc(100%-1.5rem)] rounded-2xl border border-border bg-surface p-3 sm:absolute sm:top-4 sm:left-4 sm:order-none sm:mb-0 sm:max-w-[calc(100%-2rem)] sm:bg-surface/95 sm:backdrop-blur-sm">
        <ListingsToolbar
          filters={filters}
          onFiltersChange={onFiltersChange}
          specialties={specialties}
          total={total}
        />
      </div>
      {/* `flex-1` so the map absorbs whatever height the rail column sets on the
          grid row. Left at its minimum the rail would run on past it and leave a
          band of empty page between the two. */}
      <div className="order-2 min-h-[22rem] flex-1 sm:order-none sm:min-h-[26rem]">
        {children}
      </div>
    </div>
  );
}
