import { forwardRef, useImperativeHandle, useRef } from "react";
import { Badge } from "@/components/atoms/badge";
import { CalendarIcon, MapPinIcon, UsersIcon } from "@/components/atoms/icons";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { cn } from "@/lib/cn";
import { type BrowseListing, listingBadge } from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";
import { rowEnterStyle } from "@/lib/row-enter";

/**
 * What the table lets the screen do to its rows.
 *
 * The container scrolls a picked posting into view, but a row is the table's
 * own markup, not the container's business. It used to be reached with a
 * `document.querySelector("tbody tr[data-listing-id=…]")` living in the
 * container, which meant the container knew the shape of a section it only
 * arranges — and would break the day the table's structure changed. The lookup
 * now lives here, beside the markup it reads, and the container just asks.
 */
export interface ListingsTableHandle {
  /**
   * Centers the row for `id`, when it is rendered. Returns whether the row was
   * found, so the caller can tell "scrolled" from "not on this page" without
   * reaching into the DOM itself.
   */
  scrollToId: (id: string) => boolean;
}

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
export const ListingsTable = forwardRef<
  ListingsTableHandle,
  ListingsTableProps
>(function ListingsTable(
  { listings, activeListingId, onActiveListingChange },
  ref,
) {
  const tableRef = useRef<HTMLTableElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToId: (id: string) => {
        // Scoped to this table: the map's popup button carries the same
        // `data-listing-id`, and a document-wide query would find that button
        // and report a row on screen while the reader is pages short of it.
        const row = tableRef.current?.querySelector<HTMLElement>(
          `tbody tr[data-listing-id="${id}"]`,
        );
        if (!row) return false;
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      },
    }),
    [],
  );

  return (
    <div className="hidden overflow-x-auto sm:block">
      <table ref={tableRef} className="table listings-table">
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
          {listings.map((listing, index) => {
            const active = listing.id === activeListingId;
            const badge = listingBadge(listing);
            return (
              <tr
                key={listing.id}
                data-listing-id={listing.id}
                style={rowEnterStyle(index)}
                className={cn("row-enter", active && "bg-surface-2")}
                onMouseEnter={() => onActiveListingChange?.(listing.id)}
                onMouseLeave={() => onActiveListingChange?.(null)}
              >
                <td>
                  <div className="flex items-start gap-2.5">
                    <SpecialtyIcon
                      specialty={listing.specialty}
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
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
});
