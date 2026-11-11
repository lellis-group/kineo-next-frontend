import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { CalendarIcon, MapPinIcon, UsersIcon } from "@/components/atoms/icons";
import { ListingMapButton } from "@/components/molecules/listing-map-button";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { cn } from "@/lib/cn";
import {
  type BrowseListing,
  type ListingSpotlight,
  listingBadge,
  spotlightClass,
} from "@/lib/listings";
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
  spotlight,
}: {
  listing: BrowseListing;
  /** Rank in the results list — drives the entrance stagger. */
  index?: number;
  /** True when this posting is the one the reader has chosen. */
  selectedListingId?: string | null;
  /** The one-shot mark a pick on the map leaves on its card. */
  spotlight?: ListingSpotlight | null;
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
  const router = useRouter();

  return (
    <Card
      className={cn(
        "card-lift row-enter cursor-pointer p-4",
        // The chosen card keeps the tint its row would carry on a wide screen, so
        // the choice is the same colour on both halves of the screen.
        selected && "bg-surface-2 ring-1 ring-primary/30",
        spotlightClass(spotlight, listing.id),
      )}
      style={rowEnterStyle(index ?? 0)}
      data-listing-id={listing.id}
      onClick={(event) => {
        // The title is a link and the map button is a map control; a click on
        // either must keep doing its own thing.
        if ((event.target as Element).closest("button, a")) return;
        router.push(`/listings/${listing.id}`);
      }}
    >
      <div className="flex items-start gap-3">
        <span className="icon-tilt grid size-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
          <SpecialtyIcon specialty={listing.specialty} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-1">
              <Link
                href={`/listings/${listing.id}`}
                className="font-medium text-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {listing.title}
              </Link>
              {locatable && (
                /*
                  The map control, beside the title rather than instead of it.
                  The title used to be a button, which left a keyboard reader no
                  way to open the posting from this half of the screen.
                */
                <ListingMapButton
                  title={listing.title}
                  pressed={selected}
                  onSelect={() => onListingSelect?.(listing)}
                />
              )}
            </div>
            <Badge tone={badge.tone} size="md">
              {badge.label}
            </Badge>
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
