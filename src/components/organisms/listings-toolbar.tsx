"use client";

import { Chip } from "@/components/atoms/chip";
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  MapPinIcon,
  SearchIcon,
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

/** How the rows are ordered — the labels for the sort picker. */
const BROWSE_SORTS: readonly { id: BrowseSort; label: string }[] = [
  { id: "recent", label: "Plus récentes" },
  { id: "startDate", label: "Date de début" },
];

interface ListingsToolbarProps {
  /**
   * The active filters, as the form holds them.
   *
   * One object rather than six props with six handlers, so adding a filter is a
   * line in `BrowseFormFilters` and nothing else — no new prop here, no new
   * handler in the container, and no way for one control's "no filter" state to
   * drift from another's.
   */
  filters: BrowseFormFilters;
  /** Applies a partial change. The container resets the page and the selection. */
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
  /** Which halves are shown, and its change handler. A preference, not a filter. */
  layout: BrowseLayout;
  onLayoutChange: (layout: BrowseLayout) => void;
  /**
   * The toolbar floats on the map (from `lg`), as the reference's search and
   * sort pills do: white controls over the light map instead of a dark bar
   * above it. False when the map is hidden and the toolbar is a bar again.
   */
  onMap?: boolean;
  className?: string;
}

/**
 * The map's own control row: a search, a sort, and the rest one click away.
 *
 * Two controls on the line, which is what the reference draws — a round-ended
 * search field and a sort beside it — and everything else behind « Filtres ».
 * More controls on the line would not fit the reference's row at any width, and
 * a row that cannot fit its controls is a row that wraps.
 *
 * The panel is a popover rather than an expansion below the row: it must not
 * resize the map, which is the one element on this screen whose height is worth
 * protecting. It closes on Escape, on a click outside, and after a choice.
 *
 * The city field is text rather than a picker because the backend matches it as
 * a substring (`contains`, case-insensitive): a select would have to enumerate
 * every city in the country and would stop offering the ones nobody has
 * published in yet. Submitting it as it is typed would fire a request per
 * keystroke, so it is a controlled field whose value is lifted on submit/blur.
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
  // The ink of the icons and secondary words inside a pill: white pills on the
  // map from `lg`, the dark bar otherwise.
  const pill = onMap ? MAP_PILL : undefined;
  const pillMuted = onMap ? "text-muted lg:text-black/45" : "text-muted";
  /**
   * What is typed, kept apart from what has been applied.
   *
   * Lifting on every keystroke would fire one request per character; not lifting
   * at all would make the field a dead end, since a form-less bar has no other
   * moment to commit. So the draft is local and the applied value comes back
   * down as a prop — which is also what makes the field correct when the
   * container resets the filters: without the sync below, clearing them would
   * leave the text the reader had typed still sitting in the box.
   */
  const { draft, setDraft, commit } = useCommittedInput(filters.city);

  const commitCity = () => {
    const committed = commit();
    if (committed !== null) {
      onFiltersChange({ city: committed });
    }
  };

  /**
   * Free text, applied a beat after the reader stops typing.
   *
   * Debounced rather than committed on blur, unlike the city: a search is read
   * letter by letter, and a reader expects the feed to answer as they finish a
   * word, not only when they click away. The draft is local so the box stays
   * instant; only the settled value is lifted, which collapses a burst of
   * keystrokes into one URL write and one set of reads. See `useDebouncedInput`.
   */
  const { draft: queryDraft, setDraft: setQueryDraft } = useDebouncedInput(
    filters.q,
    (value) => onFiltersChange({ q: value }),
  );

  return (
    /*
      One row, packed left, with the empty space at the end where a row of
      controls ends — the rule the browse screen's other rows already follow. The
      count sits against the controls that produced it rather than stranded at
      the far edge of a full-width bar.
    */
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/*
        Free text first, then the city: what the reader is looking for before
        where. Both `flex-1` so they share the bar's slack and each keeps a
        readable floor; on a narrow bar they wrap onto their own lines rather
        than squeeze into unusable slivers.
      */}
      <div
        className={cn("min-w-[9rem] flex-1", onMap && "lg:w-40 lg:flex-none")}
      >
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
              onMap && "lg:placeholder:text-black/45",
            )}
            placeholder="Spécialité, mot-clé…"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
          />
        </div>
      </div>

      <div
        className={cn("min-w-[9rem] flex-1", onMap && "lg:w-40 lg:flex-none")}
      >
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
              onMap && "lg:placeholder:text-black/45",
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

      {/*
        « Trier par » inside the pill, as the reference writes « Sort by ».
        The label names the control the select *is*; outside the pill it was a
        loose word between two fields, and it cost the row the width that sent
        « Filtres » to a second line. The same chrome as the pager's page-size
        pill: the label is the field, the select inside it is bare.
      */}
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
              // The options keep the dark theme's colours: a native list opens
              // on the page's dark scheme, where the pill's dark ink would vanish.
              "cursor-pointer appearance-none bg-transparent py-0 pr-5 pl-1.5 text-control font-medium whitespace-nowrap text-foreground focus:outline-none [&_option]:bg-surface [&_option]:text-foreground",
              onMap && "lg:text-map-ink",
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

      {/*
        Announced here, shown on the results card: the visible count sits
        beside « Annonces », two-tone like the reference's labels, and the
        toolbar keeps the room it needs to stay on one row.
      */}
      <p className="sr-only" aria-live="polite">
        {total} annonce{total > 1 ? "s" : ""}
      </p>

      <ListingsFilterPopover
        filters={filters}
        onFiltersChange={onFiltersChange}
        specialties={specialties}
        filtered={filtered}
        onResetFilters={onResetFilters}
        layout={layout}
        onLayoutChange={onLayoutChange}
        onMap={onMap}
      />

      {/*
        « Urgentes » is a filter, and it sits on the row rather than in the
        popover: it is the one narrowing readers reach for, and it changes the
        map, the rows and the counts together. It used to be offered as a sort
        (« Urgentes d'abord »), which kept every posting and moved none of the
        pins — not what the word promised.
      */}
      <Chip
        size="md"
        active={filters.urgentOnly}
        aria-pressed={filters.urgentOnly}
        className={cn(
          "shrink-0 whitespace-nowrap",
          onMap && !filters.urgentOnly && MAP_PILL,
          onMap &&
            filters.urgentOnly &&
            "lg:shadow-[0_2px_10px_rgb(22_21_15/0.18)]",
        )}
        onClick={() => onFiltersChange({ urgentOnly: !filters.urgentOnly })}
      >
        <AlertTriangleIcon className="mr-1 inline-block size-3.5 align-[-0.15em]" />
        Urgentes
      </Chip>
    </div>
  );
}
