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
            {/*
              `has-gutter` on exactly the columns whose cells open with an icon.
              The padding comes from `globals.css`, from the same variable the
              icon is sized from — see `.listings-table`.
            */}
            <th scope="col" className="has-gutter">
              Annonce
            </th>
            <th scope="col">Cabinet</th>
            <th scope="col" className="has-gutter">
              Lieu
            </th>
            <th scope="col" className="has-gutter">
              Période
            </th>
            <th scope="col" className="has-gutter">
              Candidats
            </th>
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
                  <div className="flex items-start gap-[var(--cell-gap)]">
                    <SpecialtyIcon
                      specialty={listing.specialty}
                      className="mt-0.5 size-[var(--cell-icon)] shrink-0 text-primary"
                    />
                    <div className="min-w-0">
                      {/*
                        Clamped, so a long title cannot make one row taller than
                        the rest and lift its own column out of line with the
                        others. `min-w-0` on the wrapper is what lets the clamp
                        engage instead of the text overflowing the cell.
                      */}
                      <p className="line-clamp-2 font-medium text-foreground">
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
                  <span className="inline-flex items-center gap-[var(--cell-gap)] text-muted">
                    <MapPinIcon className="size-[var(--cell-icon)] shrink-0" />
                    {listing.city || "—"}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center gap-[var(--cell-gap)] whitespace-nowrap text-muted">
                    <CalendarIcon className="size-[var(--cell-icon)] shrink-0" />
                    {listing.dateRange}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center gap-[var(--cell-gap)] whitespace-nowrap text-muted tabular-nums">
                    <UsersIcon className="size-[var(--cell-icon)] shrink-0" />
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
