"use client";

import {
  AlertTriangleIcon,
  SearchIcon,
  SlidersIcon,
} from "@/components/atoms/icons";
import { Select } from "@/components/molecules/select";
import { cn } from "@/lib/cn";
import { useCommittedInput } from "@/lib/hooks/use-committed-input";
import type { BrowseFormFilters } from "@/lib/listings";
import type { Specialty } from "@/lib/types/api";

/**
 * How the reader wants the results ordered. Client-side: the endpoint takes none.
 *
 * Lives with the results rather than with the filters, and the control that sets
 * it is rendered by `ListingsResultsPanel`. Sorting is not a narrowing — it does
 * not change which postings are on screen — and the endpoint that could order the
 * whole collection has no parameter for it, so it belongs next to the list it
 * orders rather than in a row of controls that narrow it.
 */
export type BrowseSort = "recent" | "urgent" | "startDate";

export interface BrowseSortOption {
  id: BrowseSort;
  label: string;
}

export const BROWSE_SORTS: readonly BrowseSortOption[] = [
  { id: "recent", label: "Plus récentes" },
  { id: "urgent", label: "Urgentes d'abord" },
  { id: "startDate", label: "Date de début" },
];

export interface SpecialtyOption {
  id: Specialty;
  label: string;
}

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
  className?: string;
}

/**
 * The filter bar, floating over the map's top edge.
 *
 * It draws the filters and reports changes; it does not own them. Returning to
 * page 1 on every filter change is the container's rule and lives there — a
 * filter change that kept page 3 would land the reader on an empty page whenever
 * the new result set is shorter than the old one.
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

  return (
    /*
     * Two siblings, not one row with a full-width child.
     *
     * The count used to sit inside the flex row with `w-full`, which reads as
     * "take the whole line" — and does so *during* the parent's intrinsic width
     * calculation too, so the card asking to hug its content measured itself as
     * full width and stretched across the map. As a sibling it no longer
     * participates, and the count still gets its own line under the controls.
     */
    <div>
      {/* Controls are packed left with no `ml-auto` on any of them.

          Pushing one control to the far right was meant to balance the row and did
          the opposite: the gap it opened grew with the viewport — 138px at 1600 and
          still growing — reading as a control dragged out of line. A row of related
          controls belongs together, and the empty space belongs at the end, where
          it reads as the end of the row.

          `items-end` rather than `items-center`: the controls are the same height,
          but a search field with a leading icon sits a pixel off a centred row and
          that pixel is visible on a dark background. */}
      <div className={cn("flex flex-wrap items-end gap-2", className)}>
        <div className="min-w-[8rem] flex-1 sm:max-w-[13rem]">
          <label className="sr-only" htmlFor="browse-city">
            Rechercher une ville
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              id="browse-city"
              type="search"
              className="field-input py-2 pl-9"
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

        <div className="min-w-[8rem]">
          <label className="sr-only" htmlFor="browse-specialty">
            Spécialité
          </label>
          <Select
            id="browse-specialty"
            className="py-2"
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

        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:w-auto sm:flex">
          <div className="min-w-0">
            <label className="sr-only" htmlFor="browse-from">
              Démarrant après le
            </label>
            <input
              id="browse-from"
              type="date"
              aria-label="Démarrant après le"
              className="field-input w-full min-w-0 py-2 sm:w-[6.5rem]"
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
              className="field-input w-full min-w-0 py-2 sm:w-[6.5rem]"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => onFiltersChange({ to: event.target.value })}
            />
          </div>
        </div>

        {/*
        Compact overrides on the shared `.chip`, and each one is here because the
        class's defaults belong to a different placement:

        - `min-h-0` — `.chip` reserves a 3rem touch target, which is right when
          chips are the whole control (`/listings/mine`) and wrong beside inputs
          that are 43px tall. Left in, this button measured 59px against 43px for
          every neighbour and dragged the row taller than the map it sits on.
        - `py-2 px-3` — the class's `0.75rem 1.125rem` is sized for a bare chip.
        - `whitespace-nowrap` — the button is a flex item and can be squeezed; at
          99px wide its icon and label stopped fitting and wrapped onto two lines,
          which is the "two floors" of content.
        - `shrink-0` — never squeezed at all, which is what makes the previous
          line a guarantee rather than a hope.
        - `min-h-[2.6875rem]` — the one value here that is not a preference: it is
          the height of the `.field-input` beside it, set so the row aligns. A
          button and an input are sized by different rules, and padding alone left
          this one 3px short of its neighbours.
      */}
        <button
          type="button"
          className={cn(
            "chip min-h-0 min-h-[2.6875rem] shrink-0 whitespace-nowrap px-3 py-2",
            filters.urgentOnly && "is-active",
          )}
          aria-pressed={filters.urgentOnly}
          onClick={() => onFiltersChange({ urgentOnly: !filters.urgentOnly })}
        >
          <AlertTriangleIcon className="mr-1 inline-block align-[-0.15em] size-3.5" />
          Urgentes
        </button>
      </div>

      <p className="mt-2 text-xs text-muted tabular-nums" aria-live="polite">
        <SlidersIcon className="mr-1 inline-block align-[-0.125em]" />
        {total} annonce{total > 1 ? "s" : ""} disponible
        {total > 1 ? "s" : ""}
      </p>
    </div>
  );
}
