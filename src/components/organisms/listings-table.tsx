import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Badge } from "@/components/atoms/badge";
import { ListingMapButton } from "@/components/molecules/listing-map-button";
import {
  ListingCandidatesCell,
  ListingPeriodCell,
} from "@/components/molecules/listing-table-cells";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { cn } from "@/lib/cn";
import {
  type BrowseListing,
  type ListingSpotlight,
  type ListingsTableHandle,
  listingBadge,
  spotlightClass,
} from "@/lib/listings";
import { SPECIALTY_LABELS } from "@/lib/profile";
import { rowEnterStyle } from "@/lib/row-enter";

interface ListingsTableProps {
  listings: BrowseListing[];
  /** Reports the row under the pointer, so the map can preview its marker. */
  onHoveredChange?: (id: string | null) => void;
  selectedListingId?: string | null;
  onListingSelect?: (listing: BrowseListing) => void;
  /** One-shot signal for the row a map pick just brought into view. */
  spotlight?: ListingSpotlight | null;
  /** On the scrolling frame itself, which must stay a direct flex child. */
  className?: string;
}

/**
 * The results, as a table on a wide container (`ListingCard` takes over below).
 *
 * Pointing at a row previews its marker; the map button selects it. The row's
 * own click is a pointer convenience — the title link and the map button are
 * the accessible paths.
 */
export const ListingsTable = forwardRef<
  ListingsTableHandle,
  ListingsTableProps
>(function ListingsTable(
  {
    listings,
    onHoveredChange,
    selectedListingId,
    onListingSelect,
    spotlight,
    className,
  },
  ref,
) {
  const tableRef = useRef<HTMLTableElement>(null);
  const router = useRouter();

  useImperativeHandle(
    ref,
    () => ({
      scrollToId: (id: string) => {
        // Scoped to the results panel (the popup carries the same
        // `data-listing-id`), keeping the copy that is laid out: the panel
        // renders either this table or cards.
        const table = tableRef.current;
        const scope = table?.closest("[data-results]") ?? table;
        const row = [
          ...(scope?.querySelectorAll<HTMLElement>(
            `[data-listing-id="${CSS.escape(id)}"]`,
          ) ?? []),
        ].find((node) => node.getClientRects().length > 0);
        if (!row) return false;
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      },
    }),
    [],
  );

  return (
    /*
     * `min-h-0 overflow-auto`: a flex item whose `min-height` would otherwise
     * default to its content and push the pager off screen. The caller passes
     * `lg:flex-1` to stretch it; `lg:h-full` on the table spreads a short
     * page's spare height across the rows. See `RESULTS_BOX`.
     *
     * No `scrollbar-gutter: stable`: most pages don't overflow, and a reserved
     * gutter would be dead space on all of them.
     */
    <div
      className={cn(
        "table-flush hidden min-h-0 overflow-auto border-b border-border @md:block",
        className,
      )}
    >
      <table ref={tableRef} className="table listings-table lg:h-full">
        <thead>
          <tr>
            {/* `has-gutter`: see `.listings-table` in `globals.css`. */}
            <th scope="col" className="has-gutter">
              Annonce
            </th>
            {/*
              Secondary columns give way to the panel's width (a size
              container), not the screen's.
            */}
            <th scope="col" className="hidden @3xl:table-cell">
              Cabinet
            </th>
            <th scope="col">Période</th>
            <th scope="col" className="hidden @2xl:table-cell">
              Candidats
            </th>
            <th scope="col" className="text-right">
              Statut
            </th>
            <th scope="col">
              <span className="sr-only">Carte</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing, index) => {
            const selected = listing.id === selectedListingId;
            const badge = listingBadge(listing);
            // Never geocoded: nothing to fly to.
            const locatable = listing.location !== null;
            return (
              <tr
                key={listing.id}
                data-listing-id={listing.id}
                data-selected={selected ? "" : undefined}
                style={rowEnterStyle(index)}
                className={cn(
                  "row-enter cursor-pointer",
                  selected && "is-selected",
                  spotlightClass(spotlight, listing.id),
                )}
                onMouseEnter={() => onHoveredChange?.(listing.id)}
                onMouseLeave={() => onHoveredChange?.(null)}
                onClick={(event) => {
                  // The title link and the map button act on their own.
                  if ((event.target as Element).closest("button, a")) return;
                  router.push(`/listings/${listing.id}`);
                }}
              >
                <td>
                  <div className="flex items-start gap-[var(--cell-gap)]">
                    <SpecialtyIcon
                      specialty={listing.specialty}
                      className="size-[var(--cell-icon)] shrink-0 text-foreground"
                    />
                    <div className="max-w-[17rem] min-w-0">
                      <Link
                        href={`/listings/${listing.id}`}
                        title={listing.title}
                        className="block truncate font-medium leading-[var(--cell-icon)] text-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {listing.title}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {SPECIALTY_LABELS[listing.specialty]}
                        <span className="@3xl:hidden">
                          {" · "}
                          {listing.practiceName}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden @3xl:table-cell">
                  <p className="max-w-[12rem] truncate leading-[var(--cell-icon)] text-foreground">
                    {listing.practiceName}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {listing.city || "—"}
                  </p>
                </td>
                <td>
                  <ListingPeriodCell
                    dateRange={listing.dateRange}
                    startDate={listing.startDate}
                    endDate={listing.endDate}
                  />
                </td>
                <td className="hidden @2xl:table-cell">
                  <ListingCandidatesCell
                    count={listing.applicationsCount}
                    max={listing.maxApplications}
                  />
                </td>
                <td className="text-right">
                  <Badge tone={badge.tone} variant="plain">
                    {badge.label}
                  </Badge>
                </td>
                <td className="w-0">
                  <span className="flex h-[var(--cell-icon)] items-center">
                    {locatable && (
                      <ListingMapButton
                        title={listing.title}
                        pressed={selected}
                        onSelect={() => onListingSelect?.(listing)}
                      />
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
