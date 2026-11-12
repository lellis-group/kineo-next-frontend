import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { Fact, FactList } from "@/components/molecules/fact-list";
import { ListingActions } from "@/components/organisms/listing-actions";
import { formatDateTime } from "@/lib/format";
import {
  formatActiveApplications,
  formatCapacity,
  formatListingAge,
  LISTING_STATUS_META,
  type MyListing,
  RECRUITING_STATUSES,
  specialtyLabel,
} from "@/lib/listings";

/**
 * The full record of one listing, with the close/cancel actions while it can
 * still take someone.
 */
export function ListingDetail({
  listing,
  acting,
  onClose,
  onCancel,
}: {
  listing: MyListing;
  acting?: boolean;
  onClose: () => void;
  onCancel: () => void;
}) {
  const status = LISTING_STATUS_META[listing.status];
  const capacity = formatCapacity(
    listing.applicationsCount,
    listing.maxApplications,
  );

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="min-w-0 flex-1 text-xl leading-snug font-medium break-words tracking-tight text-foreground sm:text-2xl">
          {listing.title}
        </h1>

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

      <FactList columns={4} className="mt-7">
        <Fact icon={CalendarIcon} term="Période">
          {listing.dateRange}
        </Fact>

        <Fact icon={MapPinIcon} term="Spécialité">
          {specialtyLabel(listing.specialty)}
        </Fact>

        <Fact icon={UsersIcon} term="Candidats">
          {capacity ?? formatActiveApplications(listing.applicationsCount)}
        </Fact>

        <Fact icon={ClockIcon} term="Annonce">
          {formatListingAge(listing)}
        </Fact>
      </FactList>

      {listing.description && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-foreground">Description</h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
            {listing.description}
          </p>
        </div>
      )}

      {listing.updatedAt && listing.updatedAt !== listing.createdAt && (
        <p className="mt-6 text-xs text-faint">
          Dernière modification le {formatDateTime(listing.updatedAt)}
        </p>
      )}

      {RECRUITING_STATUSES.has(listing.status) && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-foreground">
            Retirer l&apos;annonce de la diffusion
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Les deux actions ci-dessous terminent les candidatures en cours et
            ne sont pas réversibles.
          </p>
          <div className="mt-4">
            <ListingActions
              activeCount={listing.applicationsCount}
              acting={acting}
              onClose={onClose}
              onCancel={onCancel}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
