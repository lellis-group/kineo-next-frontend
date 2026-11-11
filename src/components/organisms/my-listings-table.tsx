import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import {
  ListingCandidatesCell,
  ListingPeriodCell,
} from "@/components/molecules/listing-table-cells";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { MyListingCard } from "@/components/organisms/my-listing-card";
import {
  formatListingAge,
  LISTING_STATUS_META,
  type MyListing,
} from "@/lib/listings";
import { SPECIALTY_SHORT_LABELS } from "@/lib/profile";

interface MyListingsTableProps {
  listings: readonly MyListing[];
}

/**
 * The practice's listings, as the reference's orders table.
 *
 * One row per posting, and the whole row is the way into the posting's own page
 * — the screen's job here is to scan the board, and every decision (candidates,
 * close, cancel) belongs to `/listings/mine/[id]`. The in-row « Voir » toggle
 * this replaces expanded the candidates under the row, which made the list a
 * second, narrower version of the page it could already open.
 *
 * Detail (title, meta, status) is not repeated twice: below `sm` the five
 * columns do not fit and `MyListingCard` is the row, rendered from the same
 * data and opening the same page.
 */
export function MyListingsTable({ listings }: MyListingsTableProps) {
  const router = useRouter();

  return (
    <div className="table-flush hidden min-h-0 flex-1 overflow-auto border-b border-border sm:block">
      <table className="table listings-table lg:h-full">
        <thead>
          <tr>
            <th scope="col" className="has-gutter">
              Annonce
            </th>
            <th scope="col">Statut</th>
            <th scope="col">Période</th>
            <th scope="col">Candidats</th>
            <th scope="col">Publication</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => {
            const status = LISTING_STATUS_META[listing.status];
            const href = `/listings/mine/${listing.id}`;

            return (
              <tr
                key={listing.id}
                className="row-enter cursor-pointer"
                onClick={(event) => {
                  // The title is a real link, so a click on it must not navigate
                  // twice.
                  if ((event.target as Element).closest("a, button")) return;
                  router.push(href);
                }}
              >
                <td>
                  <div className="flex items-start gap-[var(--cell-gap)]">
                    <SpecialtyIcon
                      specialty={listing.specialty}
                      className="size-[var(--cell-icon)] shrink-0 text-foreground"
                    />
                    <div className="min-w-0">
                      {/*
                        The title is the keyboard path as well as the pointer's
                        destination: the mobile card is a link, and a reader who
                        tabs through the board needs a named destination rather
                        than a row that only answers the mouse.
                      */}
                      <Link
                        href={href}
                        title={listing.title}
                        className="block max-w-[17rem] truncate font-medium leading-[var(--cell-icon)] text-foreground transition-colors hover:text-primary"
                      >
                        {listing.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {SPECIALTY_SHORT_LABELS[listing.specialty]}
                      </p>
                    </div>
                  </div>
                </td>

                <td>
                  <span className="flex h-[var(--cell-icon)] items-center">
                    <Badge tone={status.tone} variant="plain">
                      {status.label}
                    </Badge>
                  </span>
                </td>

                <td>
                  {/*
                    The period on two lines, the way the reference draws a
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
                    `ListingCandidatesCell`, which both tables share. The
                    ceiling carries here the meaning the « Capacité atteinte »
                    filter names: a full bar is the state the badge's legend
                    describes.
                  */}
                  <ListingCandidatesCell
                    count={listing.applicationsCount}
                    max={listing.maxApplications}
                  />
                </td>

                <td className="leading-[var(--cell-icon)] text-foreground">
                  {/*
                    One line, truncated rather than wrapped: the reference's ETA
                    column is a single short date, and a column that folds to two
                    lines makes its own row the tall one. The full sentence is
                    the cell's `title`.
                  */}
                  <span
                    className="block truncate"
                    title={formatListingAge(listing)}
                  >
                    {formatListingAge(listing)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The narrow-screen counterpart, from the same row.
 *
 * `MyListingCard` is that row without a table: it carries the same facts in the
 * same order and is a fuller surface for the same data. Both presentations are
 * rendered and one is removed by CSS, which is not the same as being hidden:
 * `display:none` also takes it out of the accessibility tree.
 */
export function MyListingsMobileList({
  listings,
}: {
  listings: readonly MyListing[];
}) {
  return (
    <ul className="flex flex-col gap-3 sm:hidden">
      {listings.map((listing) => (
        <li key={listing.id}>
          <MyListingCard listing={listing} />
        </li>
      ))}
    </ul>
  );
}
