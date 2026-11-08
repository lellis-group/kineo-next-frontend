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
 * The three summary panels down the left of the screen.
 *
 * Every number in here comes from `GET /replacement-listings/facets`, which
 * counts the whole matching collection rather than the page on screen. That is
 * the only reason these panels can exist at all: derived from the rows at hand
 * they would renumber themselves as the reader pages, and say "3 urgent" on page
 * 1 and "0 urgent" on page 2 of the same search.
 *
 * The first two panels are also controls, not reports: the « Urgentes » figure
 * toggles `urgentOnly`, and each specialty row toggles `specialty`. That is the
 * whole point of drawing a count the reader can act on — the number and the
 * filter are the same fact, and separating them made the rail a column of
 * numbers about a search the reader changed somewhere else.
 *
 * The last panel is the one thing the rail can say that is not an aggregate: the
 * posting the reader just chose, with the way back to its row. It replaces the
 * old « Volume de la recherche », which restated the first panel's totals and
 * the specialty bars in a second shape.
 *
 * The first two panel bodies are molecules shared with the practice's board
 * (`RailGauge`, `RailDistribution`): the two rails are the same column of
 * panels filled from different numbers, and they used to be written out twice.
 * The third is this rail's alone, because it is about a choice, not a count.
 */

/**
 * How many rows the specialty panel shows before folding the rest into a line.
 *
 * Five is what the reference's distribution card carries, and it is also the
 * number a column this narrow can show without the bars going shorter than the
 * labels beside them. Everything past it is counted rather than dropped: the
 * panel is a summary of a collection, and « et 3 autres » is the only honest way
 * to shorten it.
 */
const SPECIALTY_ROWS = 5;

export interface ListingsFacetsRailProps {
  /** The collection's aggregates, from the server. */
  facets: BrowseFacets;
  /** The filters currently applied — what the rail's controls light up. */
  filters: BrowseFormFilters;
  /** Applies a filter patch and returns to the first page. */
  onFiltersChange: (patch: Partial<BrowseFormFilters>) => void;
  /** The posting the reader has chosen, or null. */
  selection: BrowseSelection | null;
  /** Brings the chosen posting's row into view. */
  onSelectionReveal: () => void;
  /** Drops the choice. */
  onSelectionClear: () => void;
  /**
   * A filter or sort change is in flight.
   *
   * A page turn is deliberately not one: the rail's figures are aggregates of
   * the collection and do not change when the reader pages, so dimming them for
   * a page would claim they are being recomputed when they are not.
   */
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

  /*
    The active specialty is drawn even when it falls outside the top five.
    Otherwise applying a filter from the rail could make its own row disappear,
    and the only control that clears it would be in the toolbar above.
  */
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
      {/*
        Reserved, not conditional: a status line that appears only while loading
        would move every panel down for the length of the fetch. `invisible`
        keeps the space and takes the idle line out of the accessibility tree.
      */}
      <output
        className={cn("text-xs text-muted", !busy && "invisible")}
        aria-live="polite"
      >
        Actualisation…
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
            {/*
              The four figures of this collection, as the reference states its
              category breakdown: four boxes in a 2×2 grid, each one an icon, a
              label and a number, sitting above the arc.

              They are four readings of the same two numbers rather than four
              separate counts, which is what makes them worth drawing — a reader
              takes the share from the arc and the absolute from a chip, without
              leaving the card.
            */}
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

            {/*
              The fold. Named, and counted: five rows is a summary, and a summary
              that silently drops three categories reads as the whole collection.
            */}
            {folded > 0 && (
              <p className="mt-3 text-xs text-muted">
                et {foldedCount} annonce{plural(foldedCount)} sur {folded} autre
                {plural(folded)} spécialité{plural(folded)}
              </p>
            )}
          </>
        )}
      </Panel>

      <ListingSelectionPanel
        selection={selection}
        onReveal={onSelectionReveal}
        onClear={onSelectionClear}
      />
    </div>
  );
}

/**
 * One specialty, as the rail draws it: mark, short name, count, share — and the
 * toggle that applies it.
 *
 * Extracted from the map below so the active row and the folded one are built
 * by the same function. The row that falls outside the top five has no business
 * looking different from the ones that did.
 */
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
    /*
      The short name, not the one the endpoint sends: « Chirurgien-dentiste » and
      « Autre spécialité » are both wider than the column, and a label cut
      mid-word is worse than a terse one — the reader cannot tell which bar is
      theirs. The full name is the row's `title`.
    */
    label: SPECIALTY_SHORT_LABELS[row.specialty],
    title: row.label,
    count: row.count,
    percent: row.percent,
    active,
    onSelect: () => onFiltersChange({ specialty: active ? "" : row.specialty }),
  };
}
