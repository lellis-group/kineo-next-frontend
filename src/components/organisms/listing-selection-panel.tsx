import { Badge } from "@/components/atoms/badge";
import {
  ArrowRightIcon,
  CalendarIcon,
  CloseIcon,
  MapPinIcon,
} from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand } from "@/components/molecules/panel-chrome";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import type { BrowseSelection } from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";

/**
 * The posting the reader chose, and the way back to its row.
 *
 * The third panel of the browse rail, and the only one about a single posting
 * rather than the collection. It replaces « Volume de la recherche », which
 * restated the two panels above in a second shape and said nothing about what
 * the reader had just clicked.
 *
 * It reads from what the screen already holds — the row on the current page
 * when there is one, the map's preview otherwise — so choosing a posting on the
 * map never costs a request. That is why `specialty` and `urgent` are optional:
 * the map preview knows where a practice is, not what the posting pays, and the
 * row may be on another page.
 */
export function ListingSelectionPanel({
  selection,
  onReveal,
  onClear,
}: {
  selection: BrowseSelection | null;
  /** Scrolls to the posting's row, turning the page if it is elsewhere. */
  onReveal: () => void;
  /** Drops the choice. */
  onClear: () => void;
}) {
  return (
    <Panel
      title="Annonce sélectionnée"
      action={
        selection ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Retirer la sélection"
            title="Retirer la sélection"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CloseIcon className="size-4" />
          </button>
        ) : (
          <PanelExpand />
        )
      }
    >
      {!selection ? (
        <p className="py-6 text-center text-sm text-muted">
          Choisissez une annonce sur la carte ou dans la liste.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            {selection.specialty && (
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <SpecialtyIcon
                  specialty={selection.specialty}
                  className="size-3.5"
                />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm leading-snug font-medium text-foreground">
                {selection.title}
              </p>
              <p className="mt-1 text-xs text-muted">
                {selection.specialty
                  ? `${SPECIALTY_LABELS[selection.specialty]} · `
                  : ""}
                {selection.practiceName}
              </p>
            </div>
            {selection.urgent !== undefined && (
              <Badge
                tone={selection.urgent ? "danger" : "info"}
                size="md"
                className="shrink-0"
              >
                {selection.urgent ? "Urgent" : "Ouverte"}
              </Badge>
            )}
          </div>

          <dl className="flex flex-col gap-2 text-xs text-muted">
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="flex items-center">
                <MapPinIcon className="size-3.5 shrink-0" />
                <span className="sr-only">Lieu</span>
              </dt>
              <dd className="truncate">{selection.city || "—"}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="flex items-center">
                <CalendarIcon className="size-3.5 shrink-0" />
                <span className="sr-only">Période</span>
              </dt>
              <dd className="truncate">{selection.dateRange}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onReveal}
            className="inline-flex items-center justify-center gap-1.5 rounded-control bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Voir dans la liste
            <ArrowRightIcon className="size-3.5 shrink-0" />
          </button>
        </div>
      )}
    </Panel>
  );
}
