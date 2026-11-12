import {
  AlertTriangleIcon,
  FileTextIcon,
  LayersIcon,
  PercentIcon,
} from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand, StatChip } from "@/components/molecules/panel-chrome";
import {
  RailDistribution,
  type RailDistributionRow,
} from "@/components/molecules/rail-distribution";
import { RailEmpty } from "@/components/molecules/rail-empty";
import { RailGauge } from "@/components/molecules/rail-gauge";
import { RailWeeks } from "@/components/molecules/rail-weeks";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { ListingSelectionPanel } from "@/components/organisms/listing-selection-panel";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import type {
  BrowseFacets,
  BrowseFormFilters,
  BrowseSelection,
  SpecialtyFacet,
} from "@/lib/listings";
import { SPECIALTY_SHORT_LABELS } from "@/lib/profile";

/**
 * The summary panels down the left of the screen. Every number comes from
 * `GET /replacement-listings/facets` (the whole matching collection, not the
 * page), and the first two panels double as filter toggles.
 */

/** Rows the specialty panel shows before folding the rest into a counted line. */
const SPECIALTY_ROWS = 5;

export interface ListingsFacetsRailProps {
  facets: BrowseFacets;
  filters: BrowseFormFilters;
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  selection: BrowseSelection | null;
  onSelectionReveal: () => void;
  onSelectionClear: () => void;
  /** A filter or sort change is in flight (a page turn changes no aggregate). */
  busy?: boolean;
}

export function ListingsFacetsRail({
  facets,
  filters,
  onFiltersChange,
  selection,
  onSelectionReveal,
  onSelectionClear,
  busy = false,
}: ListingsFacetsRailProps) {
  const urgentPercent =
    facets.total > 0 ? Math.round((facets.urgent / facets.total) * 100) : 0;

  const open = Math.max(0, facets.total - facets.urgent);

  // The active specialty is drawn even outside the top five, so applying it
  // from the rail cannot hide its own row.
  const topRows = facets.bySpecialty.slice(0, SPECIALTY_ROWS);
  const activeFacet = filters.specialty
    ? facets.bySpecialty.find((row) => row.specialty === filters.specialty)
    : undefined;
  const shownRows =
    activeFacet && !topRows.includes(activeFacet)
      ? [...topRows, activeFacet]
      : topRows;
  const foldedRows = facets.bySpecialty.filter(
    (row) => !shownRows.includes(row),
  );
  const folded = foldedRows.length;
  const foldedCount = foldedRows.reduce((sum, row) => sum + row.count, 0);

  const specialtyRows: RailDistributionRow[] = shownRows.map((row) =>
    specialtyRow(row, filters.specialty === row.specialty, onFiltersChange),
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 transition-opacity duration-200",
        busy && "pointer-events-none opacity-60",
      )}
      aria-busy={busy}
    >
      {/* Screen-reader only: a visible line would push the rail out of line with the map. */}
      <output className="sr-only" aria-live="polite">
        {busy ? "Actualisation…" : ""}
      </output>

      <Panel title="Annonces urgentes" action={<PanelExpand />}>
        {facets.total === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <RailEmpty>
              Aucune annonce ne correspond à votre recherche.
            </RailEmpty>
            {filters.urgentOnly && (
              <button
                type="button"
                onClick={() => onFiltersChange({ urgentOnly: false })}
                className="text-xs font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Retirer le filtre « urgentes »
              </button>
            )}
          </div>
        ) : (
          <RailGauge
            percent={urgentPercent}
            caption={`${facets.urgent} annonce${plural(
              facets.urgent,
            )} urgente${plural(facets.urgent)} sur ${facets.total}`}
          >
            <StatChip
              icon={<LayersIcon className="size-3.5" />}
              label="Annonces"
              value={String(facets.total)}
            />
            <StatChip
              icon={<AlertTriangleIcon className="size-3.5" />}
              label="Urgentes"
              value={String(facets.urgent)}
              pressed={filters.urgentOnly}
              onClick={() =>
                onFiltersChange({ urgentOnly: !filters.urgentOnly })
              }
              title={
                filters.urgentOnly
                  ? "Retirer le filtre urgentes"
                  : "Afficher uniquement les annonces urgentes"
              }
            />
            <StatChip
              icon={<FileTextIcon className="size-3.5" />}
              label="Ouvertes"
              value={String(open)}
            />
            <StatChip
              icon={<PercentIcon className="size-3.5" />}
              label="% urgentes"
              value={`${urgentPercent} %`}
            />
          </RailGauge>
        )}
      </Panel>

      <Panel title="Répartition par spécialité" action={<PanelExpand />}>
        {facets.total === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <RailEmpty>Aucune spécialité représentée.</RailEmpty>
            {filters.specialty && (
              <button
                type="button"
                onClick={() => onFiltersChange({ specialty: "" })}
                className="text-xs font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Retirer le filtre de spécialité
              </button>
            )}
          </div>
        ) : (
          <>
            <RailDistribution rows={specialtyRows} />

            {folded > 0 && (
              <p className="mt-3 text-xs text-muted">
                et {foldedCount} annonce{plural(foldedCount)} sur {folded} autre
                {plural(folded)} spécialité{plural(folded)}
              </p>
            )}
          </>
        )}
      </Panel>

      {/* Absent rather than twelve zero bars when an older backend sends no series. */}
      {facets.byStartWeek.length > 0 && (
        <Panel title="Départs à venir" action={<PanelExpand />}>
          <RailWeeks weeks={facets.byStartWeek} />
        </Panel>
      )}

      <ListingSelectionPanel
        selection={selection}
        onReveal={onSelectionReveal}
        onClear={onSelectionClear}
      />
    </div>
  );
}

/** One specialty row, with the toggle that applies it. */
function specialtyRow(
  row: SpecialtyFacet,
  active: boolean,
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void,
): RailDistributionRow {
  return {
    key: row.specialty,
    mark: (
      <SpecialtyIcon
        specialty={row.specialty}
        className="size-4 shrink-0 text-muted"
      />
    ),
    // The short name fits the column; the full one is the row's `title`.
    label: SPECIALTY_SHORT_LABELS[row.specialty],
    title: row.label,
    count: row.count,
    percent: row.percent,
    active,
    onSelect: () => onFiltersChange({ specialty: active ? "" : row.specialty }),
  };
}
