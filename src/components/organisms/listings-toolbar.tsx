"use client";

import { Chip } from "@/components/atoms/chip";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  SearchIcon,
  SplitViewIcon,
} from "@/components/atoms/icons";
import {
  ListingsFilterPopover,
  MAP_PILL,
  type SpecialtyOption,
} from "@/components/molecules/listings-filter-popover";
import { cn } from "@/lib/cn";
import {
  useCommittedInput,
  useDebouncedInput,
} from "@/lib/hooks/use-committed-input";
import type {
  BrowseFormFilters,
  BrowseLayout,
  BrowseSort,
} from "@/lib/listings";

const BROWSE_SORTS: readonly { id: BrowseSort; label: string }[] = [
  { id: "recent", label: "Plus récentes" },
  { id: "startDate", label: "Date de début" },
];

/** The layout picker's options; the labels are accessible names and tooltips. */
const BROWSE_LAYOUTS: readonly {
  id: BrowseLayout;
  label: string;
  Icon: typeof MapIcon;
}[] = [
  { id: "split", label: "Carte et liste", Icon: SplitViewIcon },
  { id: "list", label: "Liste seule", Icon: ListIcon },
  { id: "map", label: "Carte seule", Icon: MapIcon },
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
  const pill = onMap ? MAP_PILL : undefined;
  const pillMuted = onMap ? "text-muted xl:text-black/45" : "text-muted";
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
      <div className={cn("min-w-[9rem] flex-1", onMap && "xl:min-w-[8rem]")}>
        <label className="sr-only" htmlFor="browse-q">
          Rechercher une annonce
        </label>
        <div className="relative">
          <SearchIcon
            className={cn(
              "pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2",
              pillMuted,
            )}
          />
          <input
            id="browse-q"
            type="search"
            className={cn(
              "field-input rounded-full py-1.5 pl-9",
              pill,
              onMap && "xl:placeholder:text-black/45",
            )}
            placeholder="Mot-clé…"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
          />
        </div>
      </div>

      <div className={cn("min-w-[9rem] flex-1", onMap && "xl:min-w-[8rem]")}>
        <label className="sr-only" htmlFor="browse-city">
          Rechercher une ville
        </label>
        <div className="relative">
          <MapPinIcon
            className={cn(
              "pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2",
              pillMuted,
            )}
          />
          <input
            id="browse-city"
            type="search"
            className={cn(
              "field-input rounded-full py-1.5 pl-9",
              pill,
              onMap && "xl:placeholder:text-black/45",
            )}
            placeholder="Ville ou CP"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitCity}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitCity();
              }
            }}
          />
        </div>
      </div>

      <label
        className={cn(
          "flex shrink-0 cursor-pointer items-center rounded-full border border-border py-1.5 pr-1.5 pl-3.5 transition-colors hover:border-border-strong has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring",
          pill,
        )}
      >
        <span className={cn("text-control whitespace-nowrap", pillMuted)}>
          Trier par
        </span>
        <span className="relative">
          <select
            id="browse-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as BrowseSort)}
            className={cn(
              // Native options open on the dark scheme: keep the dark theme's colours.
              "cursor-pointer appearance-none bg-transparent py-0 pr-5 pl-1.5 text-control font-medium whitespace-nowrap text-foreground focus:outline-none [&_option]:bg-surface [&_option]:text-foreground",
              onMap && "xl:text-map-ink",
            )}
          >
            {BROWSE_SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className={cn(
              "pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2",
              pillMuted,
            )}
          />
        </span>
      </label>

      {/* Announced here; shown on the results card. */}
      <p className="sr-only" aria-live="polite">
        {total} annonce{total > 1 ? "s" : ""}
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
      <fieldset
        className={cn(
          "ml-auto flex shrink-0 items-center gap-0.5 rounded-full border border-border p-1",
          onMap && MAP_PILL,
          onMap && "xl:p-1",
        )}
      >
        <legend className="sr-only">Disposition de l'écran</legend>
        {BROWSE_LAYOUTS.map(({ id, label, Icon }) => {
          const active = layout === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              aria-label={label}
              title={label}
              onClick={() => onLayoutChange(id)}
              className={cn(
                "grid size-8 cursor-pointer place-items-center rounded-full transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : cn(
                      "text-muted hover:text-foreground",
                      onMap && "xl:text-black/50 xl:hover:text-map-ink",
                    ),
              )}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
