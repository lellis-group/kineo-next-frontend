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
        A strip across the top of the map rather than a block in its corner.

        It used to be `w-fit` with only `left` set, hugging its content — which is
        what forced the controls onto two and three lines as the map narrowed, and
        a box three rows deep over a 26rem map is the most imposing thing on the
        screen. Spanning it hands the row the width it was short of and keeps it
        one line, so the bar gets shorter as it gets wider: the opposite trade.

        `inset-x-4` replaced the `w-fit` + `max-w` pair it used to need, and the
        comment explaining that pair went with it — an absolutely positioned box
        with both `left` and `right` set takes its width from those offsets and
        ignores `fit-content` anyway, which is only a problem while something is
        still asking to hug its content.

        The right edge is not the mirror of the left one: it stops short, clear of
        the map's fullscreen button. That button is `size-9` at `top-3 right-3`,
        which at this spacing unit is 43px wide sitting 10px in from the corner —
        it reaches 53px in, and a bar with `right-4` runs straight underneath it.
        At `z-10` the bar also paints over it, so the control the reader is most
        likely to press is the one the strip was hiding. `right-16` is 64px: the
        button plus a gap the same size as the bar's own inset.

        `p-2` rather than `p-3`: 0.3rem a side at this spacing unit, and on a
        strip the padding is most of what is left of the height once the second
        row is gone.
      */}
      <div className="order-1 z-10 mb-3 rounded-2xl border border-border bg-surface p-2 sm:absolute sm:top-4 sm:left-4 sm:right-16 sm:order-none sm:mb-0 sm:bg-surface/95 sm:backdrop-blur-sm">
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
