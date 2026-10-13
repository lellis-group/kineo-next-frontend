import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { CalendarIcon, MapPinIcon, UsersIcon } from "@/components/atoms/icons";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { cn } from "@/lib/cn";
import { type BrowseListing, listingBadge } from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";
import { rowEnterStyle } from "@/lib/row-enter";

/**
 * One posting, for a narrow screen.
 *
 * The mobile counterpart of `ListingsTable`, and it carries the same facts in the
 * same order. Not a condensed table: at this width a six-column grid would either
 * scroll sideways or squeeze six columns into unreadable slivers, and the reader
 * is looking for the same three things on both screens — what the posting is,
 * where it is, and when it runs.
 *
 * Shown below `sm:` only; above it the table takes over.
 */
export function ListingCard({
  listing,
  index,
  selectedListingId,
  onListingSelect,
}: {
  listing: BrowseListing;
  /** Rank in the results list — drives the entrance stagger. */
  index?: number;
  /** True when this posting is the one the reader has chosen. */
  selectedListingId?: string | null;
  /**
   * Brings the posting to the map — the same choice the table's title button
   * makes. Present only for a posting with coordinates: a practice never
   * geocoded has nowhere to fly to, and a control that cannot act is worse than
   * no control.
   */
  onListingSelect?: (listing: BrowseListing) => void;
}) {
  const badge = listingBadge(listing);
  const selected = listing.id === selectedListingId;
  const locatable = listing.location !== null;

  return (
    <Card
      className={cn(
        "card-lift row-enter p-4",
        // The chosen card keeps the tint its row would carry on a wide screen, so
        // the choice is the same colour on both halves of the screen.
        selected && "bg-surface-2 ring-1 ring-primary/30",
      )}
      style={rowEnterStyle(index ?? 0)}
      data-listing-id={listing.id}
    >
      <div className="flex items-start gap-3">
        <span className="icon-tilt grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <SpecialtyIcon specialty={listing.specialty} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {locatable ? (
              <button
                type="button"
                aria-label={`Voir ${listing.title} sur la carte`}
                aria-pressed={selected}
                onClick={() => onListingSelect?.(listing)}
                className="cursor-pointer text-left font-medium text-foreground transition-colors hover:text-primary focus-visible:text-primary"
              >
                {listing.title}
              </button>
            ) : (
              <h3 className="font-medium text-foreground">{listing.title}</h3>
            )}
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {SPECIALTY_LABELS[listing.specialty]} · {listing.practiceName}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs text-faint">
            <MapPinIcon className="size-3.5 shrink-0" />
            Lieu
          </dt>
          <dd className="mt-1 truncate text-muted">{listing.city || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs text-faint">
            <CalendarIcon className="size-3.5 shrink-0" />
            Période
          </dt>
          <dd className="mt-1 truncate text-muted">{listing.dateRange}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs text-faint">
            <UsersIcon className="size-3.5 shrink-0" />
            Candidats
          </dt>
          <dd className="mt-1 text-muted tabular-nums">
            {listing.applicationsCount}
            {listing.maxApplications ? ` / ${listing.maxApplications}` : ""}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
