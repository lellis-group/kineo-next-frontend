"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Chip } from "@/components/atoms/chip";
import { SlidersIcon } from "@/components/atoms/icons";
import { Select } from "@/components/molecules/select";
import { cn } from "@/lib/cn";
import { useDebouncedInput } from "@/lib/hooks/use-committed-input";
import type { BrowseFormFilters } from "@/lib/listings";
import type { Specialty } from "@/lib/types/api";

/**
 * A control floating on the map from `xl`. Opaque, no `backdrop-blur`: a blur
 * over the WebGL canvas is recomputed every frame and made panning stutter.
 */
export const MAP_PILL =
  "xl:border-0 xl:bg-white xl:text-map-ink xl:shadow-[0_2px_10px_rgb(22_21_15/0.18)] xl:hover:bg-white xl:hover:text-map-ink";

export interface SpecialtyOption {
  id: Specialty;
  label: string;
}

/**
 * The « Filtres » button and its popover (a popover so it never resizes the
 * map). The date fields are debounced: a native date input can emit several
 * changes while one date is chosen.
 */
export function ListingsFilterPopover({
  filters,
  onFiltersChange,
  specialties,
  filtered,
  onResetFilters,
  onMap = false,
}: {
  filters: BrowseFormFilters;
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  specialties: readonly SpecialtyOption[];
  filtered: boolean;
  onResetFilters: () => void;
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

  // Shown on the button, so applied-but-hidden filters are visible.
  const appliedFilters = [
    filters.specialty !== "",
    filters.q.trim() !== "",
    filters.from !== "",
    filters.to !== "",
  ].filter(Boolean).length;

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Focus the first field; `select` first so a phone doesn't raise its keyboard.
    panelRef.current?.querySelector<HTMLElement>("select, input")?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    // Escape returns focus to the trigger; a click outside does not.
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
            "absolute top-[calc(100%+0.5rem)] right-0 z-30 w-[19rem] max-w-[calc(100vw-2rem)] rounded-card border border-border bg-surface p-4",
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
                    // The applied `to`, not its draft.
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
