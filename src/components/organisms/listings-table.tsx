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
        //
        // The panel shows either this table or cards, by its own width, and a
        // `display: none` row scrolls nowhere while reporting success. So the
        // query covers the results panel (`data-results`) and keeps the copy
        // that is actually laid out.
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
        "table-flush hidden min-h-0 overflow-auto border-b border-border @md:block",
        className,
      )}
    >
      <table ref={tableRef} className="table listings-table lg:h-full">
        {/*
          Six columns, laid out as the reference's « Orders » table: one line of
          identity with a muted line under it, a two-line route, a figure, and a
          status in plain text at the right edge. The location joined the
          practice (« Cabinet » over its city, as « Brooklyn, New York » reads)
          and the specialty went under the title, which is what took the table
          from seven columns of two-line cells to rows of one height.
        */}
        <thead>
          <tr>
            {/* `has-gutter` on the column whose cells open with an icon — see
                `.listings-table` in `globals.css`. */}
            <th scope="col" className="has-gutter">
              Annonce
            </th>
            {/*
              The secondary columns give way to the panel's width (it is a
              size container — see `ListingsResultsPanel`), not the screen's:
              beside the facets rail the panel is narrow on a wide screen.
              « Cabinet » goes first, and its name moves under the title;
              « Candidats » next. Title, period and status always stay.
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
            {/* The map control's column: labelled for a screen reader, blank on
                screen like the reference's trailing action. */}
            <th scope="col">
              <span className="sr-only">Carte</span>
            </th>
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
                    {/*
                      One line, truncated, with the full title on hover: a
                      wrapped title is what made a row twice the height of its
                      neighbours. `max-w` bounds the column so a long title
                      cannot take the width the other columns need.
                    */}
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
