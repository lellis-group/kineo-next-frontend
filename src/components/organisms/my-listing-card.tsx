import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { CalendarIcon, MapPinIcon, UsersIcon } from "@/components/atoms/icons";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import {
  formatActiveApplications,
  formatCapacity,
  formatListingAge,
  LISTING_STATUS_META,
  type MyListing,
  specialtyLabel,
} from "@/lib/listings";

/** One of the user's listings on a narrow screen; the whole card links to its page. */
export function MyListingCard({ listing }: { listing: MyListing }) {
  const status = LISTING_STATUS_META[listing.status];
  const capacity = formatCapacity(
    listing.applicationsCount,
    listing.maxApplications,
  );

  return (
    <Link
      href={`/listings/mine/${listing.id}`}
      className="block rounded-card focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
    >
      <Card className="card-lift p-5 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-base leading-snug font-medium wrap-break-word text-foreground sm:text-lg">
              {listing.title}
            </h2>

            <MetaRow className="mt-2">
              <MetaRowItem icon={CalendarIcon}>{listing.dateRange}</MetaRowItem>
              <MetaRowItem icon={MapPinIcon}>
                {specialtyLabel(listing.specialty)}
              </MetaRowItem>
              {capacity && <MetaRowItem>{capacity}</MetaRowItem>}
            </MetaRow>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {listing.urgent && (
              <Badge tone="danger" size="md">
                Urgent
              </Badge>
            )}
            <Badge tone={status.tone} size="md">
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <MetaRow className="font-medium">
            <MetaRowItem icon={UsersIcon}>
              {formatActiveApplications(listing.applicationsCount)}
            </MetaRowItem>
            <MetaRowItem>{formatListingAge(listing)}</MetaRowItem>
          </MetaRow>
        </div>
      </Card>
    </Link>
  );
}
