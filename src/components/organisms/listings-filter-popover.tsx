"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Chip } from "@/components/atoms/chip";
import { SlidersIcon } from "@/components/atoms/icons";
import {
  BrowseFilterFields,
  type SpecialtyOption,
} from "@/components/molecules/browse-filter-fields";
import { cn } from "@/lib/cn";
import { useDismissablePopover } from "@/lib/hooks/use-dismissable-popover";
import { MAP_PILL } from "@/lib/layout";
import type { BrowseFormFilters } from "@/lib/listings";

export type { SpecialtyOption };

/** The filters a button can hide, counted for its badge. */
function countApplied(filters: BrowseFormFilters): number {
  return [
    filters.specialty !== "",
    filters.q.trim() !== "",
    filters.from !== "",
    filters.to !== "",
  ].filter(Boolean).length;
}

/**
 * The « Filtres » button and its popover. A popover rather than an inline
 * panel, so opening it never resizes the map.
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useDismissablePopover({ open, setOpen, rootRef, triggerRef });

  useEffect(() => {
    // `select` first so a phone doesn't raise its keyboard.
    if (open)
      panelRef.current?.querySelector<HTMLElement>("select, input")?.focus();
  }, [open]);

  // Shown on the button, so applied-but-hidden filters are visible.
  const applied = countApplied(filters);

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
        {applied > 0 && (
          <span
            className={cn(
              "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-medium tabular-nums",
              open
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "bg-primary/15 text-primary",
            )}
          >
            {applied}
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
          <BrowseFilterFields
            filters={filters}
            onFiltersChange={onFiltersChange}
            specialties={specialties}
            filtered={filtered}
            onResetFilters={onResetFilters}
          />
        </div>
      )}
    </div>
  );
}
