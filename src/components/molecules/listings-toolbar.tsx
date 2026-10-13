"use client";

import { AlertTriangleIcon, SearchIcon } from "@/components/atoms/icons";
import { Select } from "@/components/molecules/select";
import { cn } from "@/lib/cn";
import { useCommittedInput } from "@/lib/hooks/use-committed-input";
import type { BrowseFormFilters } from "@/lib/listings";
import type { Specialty } from "@/lib/types/api";

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
 * The filter bar, sitting on its own band above the map.
 *
 * It draws the filters and reports changes; it does not own them. Returning to
 * page 1 on every filter change is the container's rule and lives there — a
 * filter change that kept page 3 would land the reader on an empty page whenever
 * the new result set is shorter than the old one.
 *
 * Every control in the row is a pill, which is the reference's own control
 * language on this screen: a round-ended search field, a round-ended sort and a
 * round chip beside them all sit on one line at one height, so the row reads as
 * one thing rather than as four boxes.
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
     * One row, and the count sits in it rather than under it.
     *
     * The count was a second line of its own. That is a whole row — its height
     * plus its margin — spent on a number that belongs to the search it describes,
     * and it is what made the bar a block over the map rather than a strip across
     * it. In the row it costs width, which the bar now has to spare, instead of
     * height, which it does not.
     *
     * Packed against the chip rather than pushed to the far end with `ml-auto`.
     * The bar is wide now, and a count stranded at the far right of a full-width
     * strip is 1000px away from the filters that produced it; against the same
     * rule that keeps the controls packed left — the empty space belongs at the
     * end, where it reads as the end of the row.
     *
     * Its `SlidersIcon` went with the row, and so did the word « disponibles ».
     * Both were width: the icon was a glyph meaning "these are filters" on a row
     * that is nothing but filters, and the word restates what the panel to the
     * left already says in full ("Annonces ouvertes"). Between them they were
     * ~105px of the row's budget, and the row is what has to stay on one line.
     */
    <div>
      {/* Controls are packed left with no `ml-auto` on any of them.

          Pushing one control to the far right was meant to balance the row and did
          the opposite: the gap it opened grew with the viewport — 138px at 1600 and
          still growing — reading as a control dragged out of line. A row of related
          controls belongs together, and the empty space belongs at the end, where
          it reads as the end of the row.

          `items-center` rather than `items-end`: the controls are now the same
          height by construction (`py-1.5` on the inputs, `min-h-[2.375rem]` on the
          chip), so there is no baseline to correct for. */}
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <div className="min-w-[8rem] flex-1 sm:max-w-50">
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

        <div className="min-w-[8rem] shrink-0">
          <label className="sr-only" htmlFor="browse-specialty">
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
          The pair grows, but within a ceiling, and its two fields grow with it.

          Both halves of that are load-bearing.

          `flex-1` alone — with no `flex-1` on the fields — is the shape that put a
          hole in the row: the box absorbed the free width while the date inputs
          inside it stayed at their intrinsic size, and the space opened *after*
          the second date, before the chip. The `sm:flex-1` on each child is what
          closes it, because now the box that grows is filled.

          Without any `flex-1` at all, it is worse: the pair can no longer shrink
          below what two `type="date"` inputs ask for (~150px each), so on a
          narrow map the row wraps — and a bar that folds to two or three floors is
          the thing this layout was rebuilt to stop doing.

          `max-w-[22rem]` keeps the growth bounded. Uncapped, a wide map would
          hand the pair the whole slack and leave each field ~275px to hold
          `jj/mm/aaaa` and a calendar glyph; bounded, they settle around 170px,
          which is as wide as a date field needs to look like one. Past that
          ceiling the leftover goes to the end of the row, where a row of controls
          ends instead of splitting into islands.

          `min-w-[13.5rem]` is the floor: below it, the values and the calendar
          buttons start cutting into each other.
        */}
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:min-w-45 sm:max-w-[22rem] sm:flex-1">
          <div className="min-w-0 sm:flex-1">
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
          <div className="min-w-0 sm:flex-1">
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
              onChange={(event) => onFiltersChange({ to: event.target.value })}
            />
          </div>
        </div>

        {/*
        Compact overrides on the shared `.chip`, and each one is here because the
        class's defaults belong to a different placement:

        - `min-h-0` — `.chip` reserves a 3rem touch target, which is right when
          chips are the whole control (`/listings/mine`) and wrong beside inputs
          of this height. Left in, this button measured 59px against its neighbours
          and dragged the row taller than the map it sits on.
        - `py-1.5 px-3` — the class's `0.75rem 1.125rem` is sized for a bare chip.
        - `whitespace-nowrap` — the button is a flex item and can be squeezed; at
          99px wide its icon and label stopped fitting and wrapped onto two lines,
          which is the "two floors" of content.
        - `shrink-0` — never squeezed at all, which is what makes the previous
          line a guarantee rather than a hope.
        - `min-h-[2.375rem]` — the height of the `.field-input` beside it, so the
          row aligns. A button and an input are sized by different rules, and
          padding alone left this one short of its neighbours.

          It is the one value here that is arithmetic rather than taste: the inputs
          above are `py-1.5` over a 0.925rem font, which measures 38px, and the
          button is a flex item whose height is this floor and nothing else. Note
          what is given up — 38px is below the 44px a finger is comfortable with,
          though comfortably over the 24px WCAG 2.5.8 sets as the minimum target.
          `py-2` is one line away if that trade is not worth the height.
      */}
        <button
          type="button"
          className={cn(
            "chip min-h-[2.375rem] shrink-0 whitespace-nowrap px-3 py-1.5",
            filters.urgentOnly && "is-active",
          )}
          aria-pressed={filters.urgentOnly}
          onClick={() => onFiltersChange({ urgentOnly: !filters.urgentOnly })}
        >
          <AlertTriangleIcon className="mr-1 inline-block align-[-0.15em] size-3.5" />
          Urgentes
        </button>

        <p
          className="text-xs whitespace-nowrap text-muted tabular-nums"
          aria-live="polite"
        >
          {total} annonce{total > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
