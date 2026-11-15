import {
  AlertTriangleIcon,
  FileTextIcon,
  LayersIcon,
  PercentIcon,
} from "@/components/atoms/icons";
import { TextButton } from "@/components/atoms/text-button";
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
} from "@/lib/listings";
import { adaptFacetsRail } from "@/lib/listings";

/**
 * The summary panels down the left of the screen. Every number comes from
 * `GET /replacement-listings/facets` (the whole matching collection, not the
 * page), and the first two panels double as filter toggles.
 */
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
  const rail = adaptFacetsRail(facets, filters.specialty);

  const specialtyRows: RailDistributionRow[] = rail.rows.map((row) => ({
    key: row.specialty,
    mark: (
      <SpecialtyIcon
        specialty={row.specialty}
        className="size-4 shrink-0 text-muted"
      />
    ),
    label: row.label,
    title: row.label,
    count: row.count,
    percent: row.percent,
    active: row.active,
    onSelect: () =>
      onFiltersChange({ specialty: row.active ? "" : row.specialty }),
  }));

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
              <TextButton
                onClick={() => onFiltersChange({ urgentOnly: false })}
              >
                Retirer le filtre « urgentes »
              </TextButton>
            )}
          </div>
        ) : (
          <RailGauge
            percent={rail.urgentPercent}
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
              value={String(rail.open)}
            />
            <StatChip
              icon={<PercentIcon className="size-3.5" />}
              label="% urgentes"
              value={`${rail.urgentPercent} %`}
            />
          </RailGauge>
        )}
      </Panel>

      <Panel title="Répartition par spécialité" action={<PanelExpand />}>
        {facets.total === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <RailEmpty>Aucune spécialité représentée.</RailEmpty>
            {filters.specialty && (
              <TextButton onClick={() => onFiltersChange({ specialty: "" })}>
                Retirer le filtre de spécialité
              </TextButton>
            )}
          </div>
        ) : (
          <>
            <RailDistribution rows={specialtyRows} />

            {rail.foldedSpecialties > 0 && (
              <p className="mt-3 text-xs text-muted">
                et {rail.foldedCount} annonce{plural(rail.foldedCount)} sur{" "}
                {rail.foldedSpecialties} autre{plural(rail.foldedSpecialties)}{" "}
                spécialité{plural(rail.foldedSpecialties)}
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
