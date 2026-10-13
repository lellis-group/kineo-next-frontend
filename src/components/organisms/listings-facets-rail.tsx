import {
  AlertTriangleIcon,
  FileTextIcon,
  LayersIcon,
  PercentIcon,
} from "@/components/atoms/icons";
import { ProgressCurve } from "@/components/atoms/progress-curve";
import { SegmentedBar } from "@/components/atoms/segmented-bar";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand, StatChip } from "@/components/molecules/panel-chrome";
import { SpecialtyBars } from "@/components/molecules/specialty-bars";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { plural } from "@/lib/format";
import type { BrowseFacets } from "@/lib/listings";
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
 * The first panel changes with the collection. An empty one is drawn as a quiet
 * zero rather than hidden — a reader who has filtered themselves down to nothing
 * needs to be told that, in place, instead of watching a column of panels
 * disappear and take the layout with them.
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

export function ListingsFacetsRail({ facets }: { facets: BrowseFacets }) {
  const urgentPercent =
    facets.total > 0 ? Math.round((facets.urgent / facets.total) * 100) : 0;

  const open = Math.max(0, facets.total - facets.urgent);

  const shown = facets.bySpecialty.slice(0, SPECIALTY_ROWS);
  const folded = facets.bySpecialty.length - shown.length;
  const foldedCount = facets.bySpecialty
    .slice(SPECIALTY_ROWS)
    .reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Annonces urgentes" action={<PanelExpand />}>
        {facets.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucune annonce ne correspond à votre recherche.
          </p>
        ) : (
          <>
            {/*
              The four figures of this collection, as the reference states its
              category breakdown: four boxes in a 2×2 grid, each one an icon, a
              label and a number, sitting above the arc.

              They are four readings of the same two numbers rather than four
              separate counts, which is what makes them worth drawing — a reader
              takes the share from the arc and the absolute from a chip, without
              leaving the card.
            */}
            <div className="grid grid-cols-2 gap-2">
              <StatChip
                icon={<LayersIcon className="size-3.5" />}
                label="Annonces"
                value={String(facets.total)}
              />
              <StatChip
                icon={<AlertTriangleIcon className="size-3.5" />}
                label="Urgentes"
                value={String(facets.urgent)}
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
            </div>

            <div className="mt-5">
              <ProgressCurve
                percent={urgentPercent}
                caption={`${facets.urgent} annonce${plural(
                  facets.urgent,
                )} urgente${plural(facets.urgent)} sur ${facets.total}`}
              />
            </div>
          </>
        )}
      </Panel>

      <Panel title="Répartition par spécialité" action={<PanelExpand />}>
        {facets.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucune spécialité représentée.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {shown.map((row) => (
                // `min-w-0` on the row so the bar — the only elastic child — is
                // the one that gives way. With fixed widths on the label and the
                // counters, an overflowing row pushes them out of the panel
                // instead of shrinking the bar, and the percentages end up
                // printed over the page background.
                <li
                  key={row.specialty}
                  className="flex min-w-0 items-center gap-2"
                  title={row.label}
                >
                  {/*
                    The reference's distribution rows lead with a glyph for each
                    of its categories, and the glyph is what lets a reader match a
                    bar to a card they have already seen elsewhere on the screen —
                    here the same mark that opens a row of the results table. It
                    sits outside the elastic part of the row, so a long specialty
                    name gives way to it rather than the other way round.

                    The short name, not the one the endpoint sends: « Chirurgien-
                    dentiste » and « Autre spécialité » are both wider than the
                    column, and a label cut mid-word is worse than a terse one —
                    the reader cannot tell which bar is theirs. The full name is
                    the row's `title`.
                  */}
                  <SpecialtyIcon
                    specialty={row.specialty}
                    className="size-4 shrink-0 text-muted"
                  />
                  <span className="w-[6.5rem] shrink-0 truncate text-sm text-foreground">
                    {SPECIALTY_SHORT_LABELS[row.specialty]}
                  </span>
                  <span className="w-5 shrink-0 text-right text-sm font-medium text-foreground tabular-nums">
                    {row.count}
                  </span>
                  <SegmentedBar percent={row.percent} className="min-w-0" />
                  <span className="w-9 shrink-0 text-right text-xs text-muted tabular-nums">
                    {row.percent} %
                  </span>
                </li>
              ))}
            </ul>

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

      <Panel title="Volume de la recherche" action={<PanelExpand />}>
        {facets.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucun volume à afficher.
          </p>
        ) : (
          <>
            {/*
              The reference's cost card, rearranged: two small figures at the
              left, one large one in the middle, a badge at the right, and the
              bars underneath.

              The large figure is the one the panel is about — how many openings
              there are — so it takes the middle and the height, and the two
              supporting numbers are stated rather than displayed. The badge
              carries the share, which is the only figure here that is a ratio of
              two others rather than a count of things.
            */}
            <dl className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-2.5">
                <div>
                  <dt className="text-[0.6875rem] leading-tight text-muted">
                    Urgentes
                  </dt>
                  <dd className="text-lg leading-tight font-medium text-foreground tabular-nums">
                    {facets.urgent}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] leading-tight text-muted">
                    Ouvertes
                  </dt>
                  <dd className="text-lg leading-tight font-medium text-foreground tabular-nums">
                    {open}
                  </dd>
                </div>
              </div>

              <div className="text-center">
                <dd className="text-4xl leading-none font-medium text-foreground tabular-nums">
                  {facets.total}
                </dd>
                <dt className="mt-1.5 text-[0.6875rem] leading-tight text-muted">
                  annonces ouvertes
                </dt>
              </div>

              <span className="badge badge-info shrink-0 self-end">
                {urgentPercent} % urgentes
              </span>
            </dl>

            {/*
              The bars.

              The reference draws a month of consumption here; `/facets` answers
              no time series — it counts the collection — so what is drawn is what
              it does know: the collection spread across specialties. Same
              shape, same role (a distribution at a glance next to a total), no
              invented axis: each bar is labelled with the specialty it stands
              for rather than with a period that does not exist.
            */}
            <SpecialtyBars
              rows={facets.bySpecialty.slice(0, SPECIALTY_ROWS).map((row) => ({
                key: row.specialty,
                label: row.label,
                short: SPECIALTY_SHORT_LABELS[row.specialty],
                count: row.count,
              }))}
            />
          </>
        )}
      </Panel>
    </div>
  );
}
