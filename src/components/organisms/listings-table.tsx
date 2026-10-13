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
    /*
     * `scrollbar-gutter: stable` on the scroller, and it is the whole fix for a
     * panel that resized as the reader paged.
     *
     * This table has no fixed layout, so its min-content width is decided by the
     * rows themselves: 709px for a page of short postings, 825px for a page
     * carrying one long title or practice name. The scroller is the panel width
     * minus 88px, so below roughly 900px of window the table overflows — and
     * *whether* it overflows is a property of the page on screen, not of the
     * layout. Turning the page was enough to make the horizontal scrollbar
     * appear on one page and vanish on the next.
     *
     * It could not be hidden the way `SegmentedControl` and `FilterChips` hide
     * theirs: a six-column table needs a visible cue that there is more to see.
     * So the gutter is reserved instead. The bar then draws into a space that
     * was always there, and the panel keeps the same height whether or not it
     * is showing — which is the other half of it, because an appearing
     * scrollbar also takes 10–15px of *width*, re-flowing the columns and
     * making the rows taller on top of the height it added.
     *
     * The price is 10–15px of table width at every size, so the table starts
     * overflowing that much sooner. Below roughly 900px of window there is
     * simply not room for these six columns and the bar is honest about it.
     *
     * `h-full overflow-auto` rather than `overflow-x-auto`: the box this lives
     * in has a fixed height, so the rows scroll inside it instead of deciding how
     * tall the panel is. See `RESULTS_BOX` in `listings-results-panel`.
     *
     * And the frame, which is what the scrolling region is for. Now that the
     * rows move inside a box rather than the panel growing to hold them, the
     * table has edges a reader can see: the panel says « here is a panel », the
     * frame says « this much of it is the list, and the rest of it moves ».
     *
     * `border`, not `border-strong`: the frame sits *inside* a panel that is
     * itself outlined in `border`, and a stronger inner edge would read as the
     * more important of two boundaries that are not.
     *
     * It also happens to finish the table properly. `.table` drops the last
     * row's own bottom border, which used to be right when the rows ended the
     * panel and the panel's padding closed the list — from here they end at a
     * scroll edge, and this is the line that closes them.
     */
    <div className="hidden h-full overflow-auto rounded-xl border border-border [scrollbar-gutter:stable] sm:block">
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
                    {/*
                      Sized to `--cell-icon` and top-aligned against a title whose
                      first line carries the same value as its line-height (below),
                      so the icon's box and the title's first-line box are the same
                      height and start at the same y. The icon is centred on that
                      line by construction — no `mt` nudge that only held for one
                      font size.
                    */}
                    <SpecialtyIcon
                      specialty={listing.specialty}
                      className="size-[var(--cell-icon)] shrink-0 text-primary"
                    />
                    <div className="min-w-0">
                      {/*
                        Clamped, so a long title cannot make one row taller than
                        the rest and lift its own column out of line with the
                        others. `min-w-0` on the wrapper is what lets the clamp
                        engage instead of the text overflowing the cell.

                        `leading-[var(--cell-icon)]` is what lines this first line
                        up with the icon beside it, and with every other column's
                        first line: they all share one box height, so their text
                        sits at the same y across the whole row.
                      */}
                      <p className="line-clamp-2 font-medium leading-[var(--cell-icon)] text-foreground">
                        {listing.title}
                      </p>
                      <p className="text-xs text-muted">
                        {SPECIALTY_LABELS[listing.specialty]}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="leading-[var(--cell-icon)] text-muted">
                  {listing.practiceName}
                </td>
                <td>
                  <span className="inline-flex items-center gap-[var(--cell-gap)] leading-[var(--cell-icon)] text-muted">
                    <MapPinIcon className="size-[var(--cell-icon)] shrink-0" />
                    {listing.city || "—"}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center gap-[var(--cell-gap)] whitespace-nowrap leading-[var(--cell-icon)] text-muted">
                    <CalendarIcon className="size-[var(--cell-icon)] shrink-0" />
                    {listing.dateRange}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center gap-[var(--cell-gap)] whitespace-nowrap leading-[var(--cell-icon)] text-muted tabular-nums">
                    <UsersIcon className="size-[var(--cell-icon)] shrink-0" />
                    {listing.applicationsCount}
                    {listing.maxApplications
                      ? ` / ${listing.maxApplications}`
                      : ""}
                  </span>
                </td>
                <td>
                  {/*
                    The badge is taller than a text line, so top-aligning it left
                    it floating off the row's first line. Centred on a box of
                    exactly `--cell-icon` — the same line the icons are centred on
                    — its middle lands level with the title's first line and with
                    the icon columns. The overflow is absorbed by the cell padding.
                  */}
                  <span className="flex h-[var(--cell-icon)] items-center">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
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
