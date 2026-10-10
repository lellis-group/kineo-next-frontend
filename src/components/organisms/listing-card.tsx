import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import {
  CalendarIcon,
  MapPinIcon,
  StethoscopeIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { type BrowseListing, listingBadge } from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";

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
export function ListingCard({ listing }: { listing: BrowseListing }) {
  const badge = listingBadge(listing);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <StethoscopeIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground">{listing.title}</h3>
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
