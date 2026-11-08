import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { CalendarIcon } from "@/components/atoms/icons";
import { CapacityBar } from "@/components/molecules/capacity-bar";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { MyListingCard } from "@/components/organisms/my-listing-card";
import { formatDayMonth } from "@/lib/format";
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
    <div className="hidden min-h-0 flex-1 overflow-auto rounded-xl border border-border sm:block">
      <table className="table listings-table lg:h-full">
        <thead>
          <tr>
            <th scope="col" className="has-gutter">
              Annonce
            </th>
            <th scope="col">Statut</th>
            <th scope="col" className="has-gutter">
              Période
            </th>
            <th scope="col" className="has-gutter">
              Candidats
            </th>
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
                      className="size-[var(--cell-icon)] shrink-0 text-primary"
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
                        className="line-clamp-2 font-medium leading-[var(--cell-icon)] wrap-break-word text-foreground transition-colors hover:text-primary"
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
                    <Badge tone={status.tone} size="md">{status.label}</Badge>
                  </span>
                </td>

                {/*
                  The period on two lines, the way the reference draws a route:
                  a start above, an end below, the arrow standing in for
                  « Du … au … ». A range worded out is the one column whose text
                  wraps, and it would make its own row the tall one.
                */}
                <td>
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
                  {/*
                    Candidats, au trait de la maquette : le chiffre, la plage,
                    et la barre qui les lit d'un coup d'œil (voir
                    `CapacityBar`). Le plafond porte ici le sens que le filtre
                    « Capacité atteinte » nomme : une barre pleine est l'état
                    que le légende du badge décrit.
                  */}
                  <CapacityBar
                    count={listing.applicationsCount}
                    max={listing.maxApplications}
                  />
                </td>

                <td className="leading-[var(--cell-icon)] text-muted">
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
