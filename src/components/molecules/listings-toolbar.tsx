"use client";

import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/atoms/chip";
import {
  AlertTriangleIcon,
  SearchIcon,
  SlidersIcon,
} from "@/components/atoms/icons";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { Select } from "@/components/molecules/select";
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
import type { Specialty } from "@/lib/types/api";

export interface SpecialtyOption {
  id: Specialty;
  label: string;
}

/** How the rows are ordered — the labels for the sort picker. */
const BROWSE_SORTS: readonly { id: BrowseSort; label: string }[] = [
  { id: "recent", label: "Plus récentes" },
  { id: "urgent", label: "Urgentes d'abord" },
  { id: "startDate", label: "Date de début" },
];

/**
 * How the two halves share the screen — the labels for the layout picker.
 *
 * « Les deux » rather than « Côte à côte »: the split is map-over-list, not
 * side-by-side, and naming it for its shape would promise an arrangement the
 * reader does not get. It names what they see — both, one, or the other.
 */
const BROWSE_LAYOUTS: readonly { id: BrowseLayout; label: string }[] = [
  { id: "split", label: "Les deux" },
  { id: "list", label: "Liste" },
  { id: "map", label: "Carte" },
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
  className?: string;
}

/**
 * The map's own control row: a search, a sort, and the rest one click away.
 *
 * Two controls on the line, which is what the reference draws — a round-ended
 * search field and a sort beside it — and everything else behind « Filtres ». The
 * five controls this used to be would not fit the reference's row at any width,
 * and a row that cannot fit its controls is a row that wraps, which is what this
 * bar spent its last revision fighting.
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
  className,
}: ListingsToolbarProps) {
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

  // How many of the four narrowing controls are applied. It is what the « Filtres »
  // button carries: a panel that hides applied filters without saying so would
  // leave the reader reading a narrowed map with no clue what narrowed it.
  const appliedFilters = [
    filters.specialty !== "",
    filters.q.trim() !== "",
    filters.from !== "",
    filters.to !== "",
    filters.urgentOnly,
  ].filter(Boolean).length;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const dismiss = () => setOpen(false);

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };

    // Escape, without the focus trap a menu would need: the panel holds inputs,
    // and closing on the way out has to return the reader to the button.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
      <div className="min-w-[9rem] flex-1">
        <label className="sr-only" htmlFor="browse-q">
          Rechercher une annonce
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            id="browse-q"
            type="search"
            className="field-input rounded-full py-1.5 pl-9"
            placeholder="Spécialité, mot-clé…"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
          />
        </div>
      </div>

      <div className="min-w-[9rem] flex-1">
        <label className="sr-only" htmlFor="browse-city">
          Rechercher une ville
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            id="browse-city"
            type="search"
            className="field-input rounded-full py-1.5 pl-9"
            placeholder="Ville ou code postal"
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

      <div className="flex shrink-0 items-center gap-2">
        {/*
          « Trier par », visible, as the reference writes it. The label is not
          redundant with the select: it names the control the select *is*, where
          an unlabelled dropdown at this size is a box of whatever happens to be
          selected.
        */}
        <span className="hidden text-xs whitespace-nowrap text-muted lg:inline">
          Trier par
        </span>
        <label className="sr-only" htmlFor="browse-sort">
          Trier par
        </label>
        <Select
          id="browse-sort"
          className="w-44 rounded-full py-1.5"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as BrowseSort)}
        >
          {BROWSE_SORTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {/*
        The layout switch, beside the sort it belongs with — both are how the
        reader wants the screen, neither narrows anything. A `SegmentedControl`
        because it is « which of these few », the same shape as the period row.

        Shown from `lg` only, where the split it toggles actually exists and the
        bar has room for a third label; the toolbar already wraps, and a fourth
        control on a phone would push the row to two lines for a preference that
        matters most on a wide screen. The state still applies below `lg` — a
        « Liste » chosen on desktop hides the map on a phone too — it is only the
        control that is hidden, not the preference.
      */}
      <div className="hidden shrink-0 lg:block">
        <SegmentedControl
          ariaLabel="Disposition de l'écran"
          options={BROWSE_LAYOUTS}
          value={layout}
          onChange={onLayoutChange}
        />
      </div>

      <p
        className="shrink-0 text-xs whitespace-nowrap text-muted tabular-nums"
        aria-live="polite"
      >
        {total} annonce{total > 1 ? "s" : ""}
      </p>

      <div ref={rootRef} className="relative shrink-0">
        <Chip
          size="md"
          active={open}
          className="shrink-0 whitespace-nowrap"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <SlidersIcon className="mr-1 inline-block align-[-0.15em] size-3.5" />
          Filtres
          {appliedFilters > 0 && (
            <span
              className={cn(
                "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold tabular-nums",
                open
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "bg-primary/15 text-primary",
              )}
            >
              {appliedFilters}
            </span>
          )}
        </Chip>

        {open && (
          <div
            className={cn(
              "absolute top-[calc(100%+0.5rem)] right-0 z-30 w-[19rem] rounded-card border border-border bg-surface p-4",
              "shadow-[var(--shadow-pop)]",
            )}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="field-label" htmlFor="browse-specialty">
                  Spécialité
                </label>
                <Select
                  id="browse-specialty"
                  className="rounded-full py-1.5"
                  value={filters.specialty}
                  onChange={(event) =>
                    onFiltersChange({
                      specialty: event.target.value as Specialty | "",
                    })
                  }
                >
                  <option value="">Toutes spécialités</option>
                  {specialties.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/*
                The pair grows, but within a ceiling, and its two fields grow
                with it — the same shape it had on the row, kept here where there
                is finally room for it to be honest.
              */}
              <div className="flex flex-col gap-1.5">
                <span className="field-label">Date de début</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="browse-from">
                      Démarrant après le
                    </label>
                    <input
                      id="browse-from"
                      type="date"
                      aria-label="Démarrant après le"
                      className="field-input w-full min-w-0 rounded-full py-1.5"
                      value={filters.from}
                      max={filters.to || undefined}
                      onChange={(event) =>
                        onFiltersChange({ from: event.target.value })
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="browse-to">
                      Démarrant avant le
                    </label>
                    <input
                      id="browse-to"
                      type="date"
                      aria-label="Démarrant avant le"
                      className="field-input w-full min-w-0 rounded-full py-1.5"
                      value={filters.to}
                      min={filters.from || undefined}
                      onChange={(event) =>
                        onFiltersChange({ to: event.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <Chip
                size="block"
                className="shrink-0 whitespace-nowrap"
                aria-pressed={filters.urgentOnly}
                onClick={() =>
                  onFiltersChange({ urgentOnly: !filters.urgentOnly })
                }
              >
                <AlertTriangleIcon className="mr-1 inline-block align-[-0.15em] size-3.5" />
                Urgentes seulement
              </Chip>

              {/*
                The way out, and it only exists on a filtered view. It clears all
                four at once, which is the difference between a reset and four
                undos: a reader who narrowed three fields wants the collection
                back, not the last field.
              */}
              {filtered && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
                >
                  Tout réinitialiser
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
