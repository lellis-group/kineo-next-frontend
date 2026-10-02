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
 * The full record of one listing: what it is, when it runs, who it is for, how
 * many candidates it holds, and — while it can still take someone — the two
 * actions that take it out of circulation.
 *
 * The close/cancel row is on the card as well as here, and that is deliberate
 * rather than duplicated: it is the only way to clear the active applications
 * that block an account erasure, and an erasure notice that tells a practice to
 * resolve a blocker it can only reach from a list it may not be on is a dead
 * end. Both surfaces call the same service functions.
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
        <h1 className="min-w-0 flex-1 text-xl leading-snug font-bold break-words tracking-tight text-foreground sm:text-2xl">
          {listing.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {listing.urgent && <Badge tone="danger">Urgent</Badge>}
          <Badge tone={status.tone}>{status.label}</Badge>
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
          <h2 className="text-sm font-bold text-foreground">Description</h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
            {listing.description}
          </p>
        </div>
      )}

      {/* Last write rather than creation: what a practice wants to know about a
          posting it touched hours ago is whether anything moved since, and the
          two dates are usually the same on a listing nobody has edited. */}
      {listing.updatedAt && listing.updatedAt !== listing.createdAt && (
        <p className="mt-6 text-xs text-faint">
          Dernière modification le {formatDateTime(listing.updatedAt)}
        </p>
      )}

      {RECRUITING_STATUSES.has(listing.status) && (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-bold text-foreground">
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
