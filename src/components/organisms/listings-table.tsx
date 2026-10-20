import { forwardRef, useImperativeHandle, useRef } from "react";
import { Badge } from "@/components/atoms/badge";
import { CalendarIcon, MapPinIcon, UsersIcon } from "@/components/atoms/icons";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { cn } from "@/lib/cn";
import { formatDayMonth } from "@/lib/format";
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
  onActiveListingChange?: (id: string | null) => void;
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
 * Six columns, because that is what fits above the fold at this width and each
 * one answers a question a locum asks before applying: what, where, when, for
 * how many, and how contested the posting already is. Dropping the applicant
 * count to make room for something prettier would lose the column that most
 * changes what a reader does.
 *
 * Two states on a row, and neither is the other: pointing at one is a *preview*
 * that lights its marker on the map for as long as the pointer is there, and
 * choosing one is a *selection* that stays until it is dismissed. The choice is
 * made by the title button, which is also the keyboard path into the map — the
 * row itself carries no link, so without it a keyboard reader could reach the
 * map's markers and nothing else on this half of the screen.
 *
 * Hidden below `sm:`, where `ListingCard` takes over — a six-column table on a
 * phone either scrolls sideways or squeezes every column into an unreadable
 * few pixels, and both are worse than showing the same rows as cards.
 */
export const ListingsTable = forwardRef<
  ListingsTableHandle,
  ListingsTableProps
>(function ListingsTable(
  { listings, onHoveredChange, selectedListingId, onListingSelect, className },
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
     * `min-h-0 overflow-auto`: the frame is the scrolling region of a
     * full-height card, and carries no height of its own — *until the caller
     * stretches it*. It is a flex item of whatever box renders it, so a caller
     * whose panel is a bounded card passes `lg:flex-1` and the frame takes the
     * card's height; one in ordinary document flow passes nothing and the
     * frame is exactly its rows. It used to be `h-full` everywhere, so a page
     * of two rows was a frame as tall as the panel — a bordered box whose
     * lower half was nothing but empty surface, with the pager sent to the far
     * end of it.
     *
     * Stretched, the frame no longer keeps the spare room for itself, and
     * neither does the void-swap that once put it between the rows and the
     * pager: the table inside is `lg:h-full`, and a table reads its own
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
     * There used to be a `[scrollbar-gutter: stable]` on this very scroller —
     * the whole fix for a panel that resized as the reader paged, on a table
     * whose min-content width is a property of the page on screen (709px of
     * short postings, 825px of one long title, so the overflow came and went
     * by the page and took 10–15px of column width with it). It was taken off
     * to match `MyListingsTable`, where the same reasoning was tried and
     * priced out as a permanent band of dead surface inside the border on
     * every short page — the state most of this table's pages sit in. Its
     * purchase now: the columns re-flow by a scrollbar's width on the pages
     * that do overflow, which is a transition, not a layout broke mid-reader.
     *
     * And the frame, which is what the scrolling region is for. Now that the
     * rows move inside a box rather than the panel growing to hold them, the
     * table has edges a reader can see: the panel says « here is a panel », the
     * frame says « this much of it is the list ».
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
    <div
      className={cn(
        "hidden min-h-0 overflow-auto rounded-xl border border-border sm:block",
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
                className={cn("row-enter", selected && "is-selected")}
                onMouseEnter={() => onHoveredChange?.(listing.id)}
                onMouseLeave={() => onHoveredChange?.(null)}
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
                      {locatable ? (
                        /*
                          A button, not a paragraph: this is the one affordance
                          that makes the table half of the screen do something,
                          and the only one a keyboard can reach. Enter or Space
                          bring the map to the posting and open its card — the
                          exact mirror of what clicking a marker does to the list.

                          Styled as text so the column stays a column of titles
                          rather than a column of buttons; the affordance is the
                          colour on hover and the focus ring, both of which the
                          table's own rows already answer to.
                        */
                        <button
                          type="button"
                          aria-label={`Voir ${listing.title} sur la carte`}
                          aria-pressed={selected}
                          onClick={() => onListingSelect?.(listing)}
                          className="line-clamp-2 w-full cursor-pointer text-left font-medium leading-[var(--cell-icon)] text-foreground transition-colors hover:text-primary focus-visible:text-primary"
                        >
                          {listing.title}
                        </button>
                      ) : (
                        <p className="line-clamp-2 font-medium leading-[var(--cell-icon)] text-foreground">
                          {listing.title}
                        </p>
                      )}
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
                  {/*
                    The period as two lines, which is how the reference draws a
                    route: a start above, an end below, the arrow doing what
                    « Du … au … » had to do with words — and with less of them.

                    It matters here for the same reason it matters there: the cell
                    next to it is a single line, and a range worded out is the one
                    column whose text wraps to three lines and makes the row the
                    tall one. Two lines keep every row the same height.

                    `title` carries the full `dateRange` the adapter built, year
                    and all, for the reader who wants the exact wording.
                  */}
                  <span
                    className="inline-flex items-start gap-[var(--cell-gap)] whitespace-nowrap text-muted"
                    title={listing.dateRange}
                  >
                    <CalendarIcon className="mt-[0.125rem] size-[var(--cell-icon)] shrink-0" />
                    <span className="flex flex-col">
                      <span className="leading-[var(--cell-icon)]">
                        {formatDayMonth(listing.startDate)}
                      </span>
                      <span className="text-xs leading-tight text-faint">
                        → {formatDayMonth(listing.endDate)}
                      </span>
                    </span>
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
