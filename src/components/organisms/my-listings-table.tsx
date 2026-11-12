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
 * The practice's listings as a table; each row opens `/listings/mine/[id]`.
 * Below `sm`, `MyListingCard` takes over.
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
            <th scope="col">Période</th>
            <th scope="col">Candidats</th>
            <th scope="col">Publication</th>
            <th scope="col" className="text-right">
              Statut
            </th>
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
                  // The title is a real link: don't navigate twice.
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
                  <ListingPeriodCell
                    dateRange={listing.dateRange}
                    startDate={listing.startDate}
                    endDate={listing.endDate}
                  />
                </td>

                <td>
                  <ListingCandidatesCell
                    count={listing.applicationsCount}
                    max={listing.maxApplications}
                  />
                </td>

                <td className="leading-[var(--cell-icon)] text-foreground">
                  <span
                    className="block truncate"
                    title={formatListingAge(listing)}
                  >
                    {formatListingAge(listing)}
                  </span>
                </td>

                <td className="text-right">
                  <Badge tone={status.tone} variant="plain">
                    {status.label}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The narrow-screen counterpart; the table is removed by CSS. */
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
