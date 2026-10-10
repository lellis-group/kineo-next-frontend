import { Badge } from "@/components/atoms/badge";
import {
  CalendarIcon,
  MapPinIcon,
  StethoscopeIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { type BrowseListing, listingBadge } from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";

interface ListingsTableProps {
  listings: BrowseListing[];
  /** Row the reader is pointing at; mirrored onto its map marker. */
  activeListingId?: string | null;
  onActiveListingChange?: (id: string | null) => void;
}

/**
 * The results, as a table on a wide screen.
 *
 * Six columns, because that is what fits above the fold at this width and each
 * one answers a question a locum asks before applying: what, where, when, for
 * how many, and how contested the posting already is. Dropping the applicant
 * count to make room for something prettier would lose the column that most
 * changes what a reader does.
 *
 * Hidden below `sm:`, where `ListingCard` takes over — a six-column table on a
 * phone either scrolls sideways or squeezes every column into an unreadable
 * few pixels, and both are worse than showing the same rows as cards.
 */
export function ListingsTable({
  listings,
  activeListingId,
  onActiveListingChange,
}: ListingsTableProps) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Annonce</th>
            <th scope="col">Cabinet</th>
            <th scope="col">Lieu</th>
            <th scope="col">Période</th>
            <th scope="col">Candidats</th>
            <th scope="col">Statut</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => {
            const active = listing.id === activeListingId;
            const badge = listingBadge(listing);
            return (
              <tr
                key={listing.id}
                className={cn(active && "bg-surface-2")}
                onMouseEnter={() => onActiveListingChange?.(listing.id)}
                onMouseLeave={() => onActiveListingChange?.(null)}
              >
                <td>
                  <div className="flex items-start gap-2.5">
                    <StethoscopeIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {listing.title}
                      </p>
                      <p className="text-xs text-muted">
                        {SPECIALTY_LABELS[listing.specialty]}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-muted">{listing.practiceName}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <MapPinIcon className="size-3.5 shrink-0" />
                    {listing.city || "—"}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    {listing.dateRange}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted tabular-nums">
                    <UsersIcon className="size-3.5 shrink-0" />
                    {listing.applicationsCount}
                    {listing.maxApplications
                      ? ` / ${listing.maxApplications}`
                      : ""}
                  </span>
                </td>
                <td>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
