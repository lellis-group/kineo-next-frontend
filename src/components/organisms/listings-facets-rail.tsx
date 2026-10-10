import { ProgressCurve } from "@/components/atoms/progress-curve";
import { SegmentedBar } from "@/components/atoms/segmented-bar";
import { Panel } from "@/components/molecules/panel";
import { plural } from "@/lib/format";
import type { BrowseFacets } from "@/lib/listings";

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
export function ListingsFacetsRail({ facets }: { facets: BrowseFacets }) {
  const urgentPercent =
    facets.total > 0 ? Math.round((facets.urgent / facets.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Annonces urgentes">
        {facets.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucune annonce ne correspond à votre recherche.
          </p>
        ) : (
          <ProgressCurve
            percent={urgentPercent}
            caption={`${facets.urgent} annonce${plural(
              facets.urgent,
            )} urgente${plural(facets.urgent)} sur ${facets.total}`}
          />
        )}
      </Panel>

      <Panel title="Répartition par spécialité">
        {facets.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucune spécialité représentée.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {facets.bySpecialty.map((row) => (
              // `min-w-0` on the row so the bar — the only elastic child — is the
              // one that gives way. With fixed widths on the label and the
              // counters, an overflowing row pushes them out of the panel instead
              // of shrinking the bar, and the percentages end up printed over the
              // page background.
              <li
                key={row.specialty}
                className="flex min-w-0 items-center gap-2"
              >
                <span className="w-24 shrink-0 truncate text-sm text-foreground">
                  {row.label}
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
        )}
      </Panel>

      <Panel title="Volume de la recherche">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Annonces ouvertes</p>
            <p className="mt-1 text-3xl font-medium text-foreground tabular-nums">
              {facets.total}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Dont urgentes</p>
            <p className="mt-1 text-3xl font-medium text-primary tabular-nums">
              {facets.urgent}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Les chiffres portent sur l&apos;ensemble des annonces correspondant à
          vos filtres, specialty exclue, et ne changent pas d&apos;une page à
          l&apos;autre.
        </p>
      </Panel>
    </div>
  );
}
