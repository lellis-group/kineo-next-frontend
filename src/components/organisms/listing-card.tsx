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

/** One posting, for a narrow container — the mobile counterpart of `ListingsTable`. */
export function ListingCard({
  listing,
  index,
  selectedListingId,
  onListingSelect,
  spotlight,
}: {
  listing: BrowseListing;
  index?: number;
  selectedListingId?: string | null;
  spotlight?: ListingSpotlight | null;
  /** Brings the posting to the map; only offered for a geocoded posting. */
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
        selected && "bg-surface-2 ring-1 ring-primary/30",
        spotlightClass(spotlight, listing.id),
      )}
      style={rowEnterStyle(index ?? 0)}
      data-listing-id={listing.id}
      onClick={(event) => {
        // The title link and the map button act on their own.
        if ((event.target as Element).closest("button, a")) return;
        router.push(`/listings/${listing.id}`);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="icon-tilt grid size-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
          <SpecialtyIcon specialty={listing.specialty} className="size-4" />
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {locatable && (
            <ListingMapButton
              title={listing.title}
              pressed={selected}
              onSelect={() => onListingSelect?.(listing)}
            />
          )}
          <Badge tone={badge.tone} size="md">
            {badge.label}
          </Badge>
        </div>
      </div>

      <Link
        href={`/listings/${listing.id}`}
        className="mt-3 block leading-snug font-medium text-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {listing.title}
      </Link>
      <p className="mt-1 text-xs text-muted">
        {SPECIALTY_LABELS[listing.specialty]} · {listing.practiceName}
      </p>

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
