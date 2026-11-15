"use client";

import { Chip } from "@/components/atoms/chip";
import {
  AlertTriangleIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  SearchIcon,
  SplitViewIcon,
} from "@/components/atoms/icons";
import { SelectPill } from "@/components/atoms/select-pill";
import type { SpecialtyOption } from "@/components/molecules/browse-filter-fields";
import { IconField } from "@/components/molecules/icon-field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { ListingsFilterPopover } from "@/components/organisms/listings-filter-popover";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import {
  useCommittedInput,
  useDebouncedInput,
} from "@/lib/hooks/use-committed-input";
import { MAP_PILL } from "@/lib/layout";
import type {
  BrowseFormFilters,
  BrowseLayout,
  BrowseSort,
} from "@/lib/listings";

const SORTS: readonly { value: BrowseSort; label: string }[] = [
  { value: "recent", label: "Plus récentes" },
  { value: "startDate", label: "Date de début" },
];

/** The layout picker's options; the labels are accessible names and tooltips. */
const LAYOUTS: readonly {
  id: BrowseLayout;
  label: string;
  icon: typeof MapIcon;
}[] = [
  { id: "split", label: "Carte et liste", icon: SplitViewIcon },
  { id: "list", label: "Liste seule", icon: ListIcon },
  { id: "map", label: "Carte seule", icon: MapIcon },
];

interface ListingsToolbarProps {
  filters: BrowseFormFilters;
  /** The container resets the page and the selection. */
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  specialties: readonly SpecialtyOption[];
  total: number;
  filtered: boolean;
  onResetFilters: () => void;
  sort: BrowseSort;
  onSortChange: (sort: BrowseSort) => void;
  layout: BrowseLayout;
  onLayoutChange: (layout: BrowseLayout) => void;
  /** The toolbar floats on the map from `xl` (white pills over the map). */
  onMap?: boolean;
  className?: string;
}

/**
 * The map's control row: search, city, sort, the « Filtres » popover (which
 * must not resize the map), urgency and layout.
 *
 * The city is free text because the backend matches it as a substring; it is
 * committed on submit/blur rather than per keystroke.
 */
export function ListingsToolbar({
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
  onMap = false,
  className,
}: ListingsToolbarProps) {
  const overlay = onMap ? "overlay" : "plain";
  // Local draft, committed on submit/blur; re-synced when filters reset.
  const { draft, setDraft, commit } = useCommittedInput(filters.city);

  const commitCity = () => {
    const committed = commit();
    if (committed !== null) {
      onFiltersChange({ city: committed });
    }
  };

  // Debounced rather than committed on blur: a search should answer as the
  // reader finishes a word.
  const { draft: queryDraft, setDraft: setQueryDraft } = useDebouncedInput(
    filters.q,
    (value) => onFiltersChange({ q: value }),
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <IconField
        id="browse-q"
        icon={SearchIcon}
        label="Rechercher une annonce"
        placeholder="Mot-clé…"
        value={queryDraft}
        onChange={setQueryDraft}
        overlay={onMap}
      />

      <IconField
        id="browse-city"
        icon={MapPinIcon}
        label="Rechercher une ville"
        placeholder="Ville ou CP"
        value={draft}
        onChange={setDraft}
        onBlur={commitCity}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitCity();
          }
        }}
        overlay={onMap}
      />

      <SelectPill
        id="browse-sort"
        label="Trier par"
        value={sort}
        onChange={onSortChange}
        options={SORTS}
        variant={overlay}
      />

      {/* Announced here; shown on the results card. */}
      <p className="sr-only" aria-live="polite">
        {total} annonce{plural(total)}
      </p>

      <ListingsFilterPopover
        filters={filters}
        onFiltersChange={onFiltersChange}
        specialties={specialties}
        filtered={filtered}
        onResetFilters={onResetFilters}
        onMap={onMap}
      />

      {/* A filter, not a sort: it narrows the map, the rows and the counts. */}
      <Chip
        size="md"
        active={filters.urgentOnly}
        aria-pressed={filters.urgentOnly}
        className={cn(
          "shrink-0 whitespace-nowrap",
          onMap && !filters.urgentOnly && MAP_PILL,
          onMap &&
            filters.urgentOnly &&
            "xl:shadow-[0_2px_10px_rgb(22_21_15/0.18)]",
        )}
        onClick={() => onFiltersChange({ urgentOnly: !filters.urgentOnly })}
      >
        <AlertTriangleIcon className="mr-1 inline-block size-3.5 align-[-0.15em]" />
        Urgentes
      </Chip>

      {/* On the row in every layout, so « Liste seule » can always be undone. */}
      <SegmentedControl
        ariaLabel="Disposition de l'écran"
        options={LAYOUTS}
        value={layout}
        onChange={onLayoutChange}
        variant={overlay}
        className="ml-auto shrink-0"
      />
    </div>
  );
}
