import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Badge } from "@/components/atoms/badge";
import { MapPinIcon } from "@/components/atoms/icons";
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
  /**
   * Reports the row under the pointer, so the map can preview its marker.
   *
   * A handler and not a value: the table does not need to be told what it is
   * already hovering, and reading the current state back into the rows would
   * make the two halves of one gesture share a state for nothing.
   */
  onHoveredChange?: (id: string | null) => void;
  /**
   * The posting the reader has chosen, and the way to choose another.
   *
   * Two props rather than one value plus one handler, because the choice is not
   * symmetric with the hover: the hover is a value the table reports, the choice
   * is a posting the table offers and the screen acts on — it needs the whole
   * row, coordinates included, because acting on it means flying the camera.
   */
  selectedListingId?: string | null;
  onListingSelect?: (listing: BrowseListing) => void;
  /**
   * The posting a pick on the map just brought into view.
   *
   * Transient, and separate from `selectedListingId`: the selection is the
   * choice, this is the one-shot signal that says which row changed under the
   * reader. See `spotlightClass`.
   */
  spotlight?: ListingSpotlight | null;
  /**
   * On the scrolling frame itself.
   *
   * The panel puts the dimming of a refresh here rather than around the table,
   * which is what lets the frame be a *direct* child of the results box: an
   * element between them would have to carry the same `min-height: 0` for the
   * flex chain to keep reaching the frame, and one link in that chain missing it
   * is enough for the table to push past the box instead of scrolling inside it.
   */
  className?: string;
}

/**
 * The results, as a table on a wide screen.
 *
 * Seven columns, because each answers a question a locum asks before applying:
 * what, where, when, for how many, how contested the posting already is, and —
 * the seventh — where on the map it is. Dropping the applicant count to make
 * room for something prettier would lose the column that most changes what a
 * reader does.
 *
 * Two states on a row, and neither is the other: pointing at one is a *preview*
 * that lights its marker on the map for as long as the pointer is there, and
 * choosing one is a *selection* that stays until it is dismissed. The title is
 * the link to the posting, and the map button is its own column (under its
 * « Carte » label): the row's own click is a pointer convenience, not the
 * accessible path, so a keyboard reader can do both without a focusable `<tr>`.
 *
 * Hidden below `sm:`, where `ListingCard` takes over — a seven-column table on
 * a phone either scrolls sideways or squeezes every column into an unreadable
 * few pixels, and both are worse than showing the same rows as cards.
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
        // Scoped to this table: the map's popup button carries the same
        // `data-listing-id`, and a document-wide query would find that button
        // and report a row on screen while the reader is pages short of it.
        // `CSS.escape` keeps the id a value rather than selector syntax: an id
        // is the backend's, and one quote in it would break the query.
        const row = tableRef.current?.querySelector<HTMLElement>(
          `tbody tr[data-listing-id="${CSS.escape(id)}"]`,
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
     * `min-h-0 overflow-auto`: the frame is the scrolling region of a
     * full-height card, and carries no height of its own — *until the caller
     * stretches it*. It is a flex item of whatever box renders it, so a caller
     * whose panel is a bounded card passes `lg:flex-1` and the frame takes the
     * card's height; one in ordinary document flow passes nothing and the
     * frame is exactly its rows. `h-full` everywhere would make a page of two
     * rows a frame as tall as the panel — a bordered box whose lower half is
     * nothing but empty surface, with the pager sent to the far end of it.
     *
     * Stretched, the frame does not keep the spare room for itself, nor put it
     * between the rows and the pager: the table inside is `lg:h-full`, and a
     * table reads its own
     * height as a *minimum* — so a short page's extra height is distributed
     * to the rows (never squeezing them, never leaving them a stretch of
     * bordered nothing under them), and a long page overflows into the
     * scroll `min-h-0` asks for. The same treatment as `MyListingsTable`,
     * which shares this frame and this rule.
     *
     * `min-h-0` is what keeps the scroll half working either way. As a flex item
     * this box may shrink, and a flex item's `min-height` defaults to its
     * content — so without it a full page of rows would refuse to shrink, push
     * past the results box and take the pager off screen. With it the frame is
     * capped at the height the panel gives it and `overflow-auto` scrolls the
     * rows inside. A short page is its own height in flow, the box's when
     * stretched. See `RESULTS_BOX` in `listings-results-panel`.
     *
     * No `[scrollbar-gutter: stable]` on this scroller, as on
     * `MyListingsTable`. The table's min-content width is a property of the
     * page on screen (709px of short postings, 825px of one long title), so the
     * overflow comes and goes by the page and takes 10–15px of column width
     * with it — but a reserved gutter is a permanent band of dead surface
     * inside the border on every short page, the state most pages sit in. The
     * price instead: the columns re-flow by a scrollbar's width on the pages
     * that do overflow, which is a transition, not a layout broken mid-reader.
     *
     * No frame of its own: `table-flush` runs the header band and the row
     * dividers to the card's edges, as the reference does, and the panel is the
     * only box. The one line kept is the bottom rule. `.table` drops the last
     * row's own border, which suits a list the panel's padding closes; here the
     * rows can end at a scroll edge, and this rule is what closes them.
     */
    <div
      className={cn(
        "table-flush hidden min-h-0 overflow-auto border-b border-border sm:block",
        className,
      )}
    >
      <table ref={tableRef} className="table listings-table lg:h-full">
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
            {/*
              The map column: a control, not an icon, so no `has-gutter` — the
              button sits on the cell's own left padding, exactly where this
              label does.
            */}
            <th scope="col">Carte</th>
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
            const selected = listing.id === selectedListingId;
            const badge = listingBadge(listing);
            // A posting whose practice was never geocoded has nothing to fly to:
            // the button would be a control that cannot act, so it is not drawn.
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
                  // The title is a link and the map button is a map control; a
                  // click on either must keep doing its own thing.
                  if ((event.target as Element).closest("button, a")) return;
                  router.push(`/listings/${listing.id}`);
                }}
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
                      <Link
                        href={`/listings/${listing.id}`}
                        className="line-clamp-2 font-medium leading-[var(--cell-icon)] text-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {listing.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {SPECIALTY_LABELS[listing.specialty]}
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  {/*
                    The map control, in a column of its own.

                    A title's length belongs to its row, so an icon taken to
                    wherever the text had just ended sat at a different x on
                    every row — and on a wrapped title the line rarely fills its
                    box, so even a constant gap read as a moveable one. In its
                    own cell, under the « Carte » label, the control is one x —
                    a column of the table like any other.

                    Like the badge's cell, the control is taller than a text
                    line, so it stands in a box of exactly `--cell-icon`: its
                    middle lands level with the title's first line and with the
                    icon columns, whatever the row's height.
                  */}
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
                  {/*
                    The period as two lines, which is how the reference draws a
                    route — see `ListingPeriodCell`, which both tables share.
                  */}
                  <ListingPeriodCell
                    dateRange={listing.dateRange}
                    startDate={listing.startDate}
                    endDate={listing.endDate}
                  />
                </td>
                <td>
                  {/*
                    Candidats, au trait de la maquette — see
                    `ListingCandidatesCell`, which both tables share.
                  */}
                  <ListingCandidatesCell
                    count={listing.applicationsCount}
                    max={listing.maxApplications}
                  />
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
                    <Badge tone={badge.tone} size="md">
                      {badge.label}
                    </Badge>
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
