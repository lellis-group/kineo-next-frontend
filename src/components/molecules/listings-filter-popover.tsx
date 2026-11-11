"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Chip } from "@/components/atoms/chip";
import { AlertTriangleIcon, SlidersIcon } from "@/components/atoms/icons";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { Select } from "@/components/molecules/select";
import { cn } from "@/lib/cn";
import { useDebouncedInput } from "@/lib/hooks/use-committed-input";
import type { BrowseFormFilters, BrowseLayout } from "@/lib/listings";
import type { Specialty } from "@/lib/types/api";

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

/**
 * A control floating on the map, from `lg`: white and shadowed like the map's
 * own buttons, dark ink. Below `lg` the toolbar is an ordinary bar over the
 * map and the control keeps its dark chrome.
 *
 * Opaque, and no `backdrop-blur`: a blurred backdrop over the WebGL canvas
 * is recomputed on every frame the map moves, and four pills of it made the
 * map stutter on each pan, zoom and re-frame after a filter change.
 */
export const MAP_PILL =
  "lg:border-0 lg:bg-white lg:text-map-ink lg:shadow-[0_2px_10px_rgb(22_21_15/0.18)] lg:hover:bg-white lg:hover:text-map-ink";

export interface SpecialtyOption {
  id: Specialty;
  label: string;
}

/**
 * The « Filtres » button and the panel it opens.
 *
 * Extracted from `ListingsToolbar` because the popover has its own state and
 * its own focus rules — a trigger, a dialog, four debounced fields, and the
 * outside-click and Escape handlers that close it. Leaving it inline made the
 * toolbar file the place to read about popover lifecycle, when the toolbar's
 * own job is the row around it.
 *
 * The panel is a popover rather than an expansion below the row: it must not
 * resize the map, which is the one element on this screen whose height is worth
 * protecting. It closes on Escape, on a click outside, and after a choice.
 *
 * The date fields keep their own drafts: a native date input can emit several
 * changes while one date is being chosen, and each would otherwise write the
 * URL and re-read the feed. Debounced, a burst collapses into one apply. Each
 * bound commits independently, which is correct because a range is two filters,
 * not one.
 */
export function ListingsFilterPopover({
  filters,
  onFiltersChange,
  specialties,
  filtered,
  onResetFilters,
  layout,
  onLayoutChange,
  onMap = false,
}: {
  filters: BrowseFormFilters;
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  specialties: readonly SpecialtyOption[];
  /** True on any filtered, non-default view — drives the reset affordance. */
  filtered: boolean;
  onResetFilters: () => void;
  /**
   * The screen's layout, switched from here. It used to be a third track on
   * the toolbar; the toolbar now floats on the map as the reference's search
   * and sort pills, and a display preference is the one control there that
   * narrows nothing. It lives with the filters because this button is on
   * screen in all three layouts, the map-less one included.
   */
  layout: BrowseLayout;
  onLayoutChange: (layout: BrowseLayout) => void;
  /** Drawn as a white pill on the map from `lg` (see `ListingsToolbar`). */
  onMap?: boolean;
}) {
  const { draft: fromDraft, setDraft: setFrom } = useDebouncedInput(
    filters.from,
    (value) => onFiltersChange({ from: value }),
  );
  const { draft: toDraft, setDraft: setTo } = useDebouncedInput(
    filters.to,
    (value) => onFiltersChange({ to: value }),
  );

  // How many of the four narrowing controls are applied. It is what the
  // « Filtres » button carries: a panel that hides applied filters without
  // saying so would leave the reader reading a narrowed map with no clue what
  // narrowed it.
  const appliedFilters = [
    filters.specialty !== "",
    filters.q.trim() !== "",
    filters.from !== "",
    filters.to !== "",
    filters.urgentOnly,
  ].filter(Boolean).length;

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Land a keyboard reader on the first field rather than leaving focus on the
    // trigger: the panel is the reason the button was pressed. `select` first,
    // so a phone does not raise its keyboard on open.
    panelRef.current?.querySelector<HTMLElement>("select, input")?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    // Escape closes and hands focus back to the trigger. A click outside does
    // not: the reader is already on their way somewhere else, and pulling focus
    // back to this button would undo that.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Chip
        ref={triggerRef}
        size="md"
        active={open}
        className={cn("shrink-0 whitespace-nowrap", onMap && MAP_PILL)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersIcon className="mr-1 inline-block align-[-0.15em] size-3.5" />
        Filtres
        {appliedFilters > 0 && (
          <span
            className={cn(
              "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-medium tabular-nums",
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
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Filtres de recherche"
          className={cn(
            "absolute top-[calc(100%+0.5rem)] right-0 z-30 w-[19rem] rounded-card border border-border bg-surface p-4",
            "shadow-[var(--shadow-pop)]",
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="field-label">Affichage</span>
              <SegmentedControl
                className="self-start"
                ariaLabel="Disposition de l'écran"
                options={BROWSE_LAYOUTS}
                value={layout}
                onChange={onLayoutChange}
              />
            </div>

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
              The pair grows, but within a ceiling, and its two fields grow with
              it — the same shape it had on the row, kept here where there is
              finally room for it to be honest.
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
                    value={fromDraft}
                    // The settled `to`, not its draft: the ceiling is what is
                    // actually applied, and reading a half-typed bound here
                    // would reject a date the reader is still entering.
                    max={filters.to || undefined}
                    onChange={(event) => setFrom(event.target.value)}
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
                    value={toDraft}
                    min={filters.from || undefined}
                    onChange={(event) => setTo(event.target.value)}
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
  );
}
