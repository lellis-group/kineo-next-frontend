import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { CalendarIcon, MapPinIcon, UsersIcon } from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import { ReceivedApplicationCard } from "@/components/molecules/received-application-card";
import { ListingActions } from "@/components/organisms/listing-actions";
import { plural } from "@/lib/format";
import {
  formatActiveApplications,
  formatCapacity,
  formatListingAge,
  LISTING_STATUS_META,
  type ListingApplicationsData,
  type MyListing,
  RECRUITING_STATUSES,
  specialtyLabel,
} from "@/lib/listings";

export interface MyListingCardProps {
  listing: MyListing;
  /** Candidates already loaded, or undefined while the panel is closed. */
  received?: ListingApplicationsData;
  loading?: boolean;
  /** Failure on this listing only. */
  error?: string;
  /** Confirmation on this listing only, distinct from a failure. */
  feedback?: string;
  expanded: boolean;
  /** True while a close/cancel request is in flight. */
  acting?: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCancel: () => void;
}

/**
 * One of the user's listings, expandable into the candidates who applied.
 *
 * The action row sits outside the collapsible panel on purpose: `close` and
 * `cancel` are also how a practice clears the active applications that block
 * an account erasure, and hiding them behind the panel would make the blocker
 * unresolvable from the page that reports it.
 *
 * The card carries the facts a practice scans for — status, period, specialty,
 * age, how many candidates are in the pipe — and the disclosure stays the fast
 * path for triaging. The full record, with the whole candidate list filterable
 * and paginated, is one click away on the dedicated page.
 */
export function MyListingCard({
  listing,
  received,
  loading,
  error,
  feedback,
  expanded,
  acting,
  onToggle,
  onClose,
  onCancel,
}: MyListingCardProps) {
  const status = LISTING_STATUS_META[listing.status];
  const recruiting = RECRUITING_STATUSES.has(listing.status);
  const capacity = formatCapacity(
    listing.applicationsCount,
    listing.maxApplications,
  );
  const applications = received?.applications;
  const candidateCount = applications?.length ?? 0;
  // The panel holds one page of ten, so it cannot claim to be the whole
  // pipeline. The remainder is named rather than hidden: a practice that reads
  // five rows and concludes nobody else applied is exactly the mistake this
  // line prevents.
  const truncated = (received?.total ?? 0) > candidateCount;
  const hasError = Boolean(error);
  // Stable per listing: React.useId would change it when the panel unmounts,
  // which is exactly when `aria-controls` has to keep pointing somewhere.
  const panelId = `listing-candidates-${listing.id}`;

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* The title is the link, not a link wrapped around the card: the card
              also holds two disclosure-driven panels and two terminal actions,
              and nesting interactive elements inside a link is what makes
              keyboard users skip the whole thing. */}
          <h2 className="text-[15px] leading-snug font-bold break-words text-foreground sm:text-lg">
            <Link
              href={`/listings/mine/${listing.id}`}
              className="transition-colors hover:text-primary"
            >
              {listing.title}
            </Link>
          </h2>

          <MetaRow className="mt-2">
            <MetaRowItem icon={CalendarIcon}>{listing.dateRange}</MetaRowItem>
            <MetaRowItem icon={MapPinIcon}>
              {specialtyLabel(listing.specialty)}
            </MetaRowItem>
            {capacity && <MetaRowItem>{capacity}</MetaRowItem>}
          </MetaRow>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {listing.urgent && <Badge tone="danger">Urgent</Badge>}
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <MetaRow className="font-medium">
          <MetaRowItem icon={UsersIcon}>
            {formatActiveApplications(listing.applicationsCount)}
          </MetaRowItem>
          <MetaRowItem>{formatListingAge(listing)}</MetaRowItem>
        </MetaRow>

        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 self-start sm:self-auto">
          {/* Plain text toggle, the treatment the site uses for a secondary
              card action (`ActivityFeed`'s « Tout voir »). No chevron: the
              codebase has no disclosure-by-chevron anywhere, and the label plus
              `aria-expanded` already carry the state. */}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            {expanded ? "Masquer les candidatures" : "Voir les candidatures"}
          </button>

          <Link
            href={`/listings/mine/${listing.id}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <UsersIcon className="h-3.5 w-3.5" />
            Fiche détaillée
          </Link>
        </div>
      </div>

      {feedback && (
        <InlineAlert tone="success" className="mt-4">
          {feedback}
        </InlineAlert>
      )}

      {hasError && (
        <InlineAlert as="p" tone="danger" className="mt-4">
          {error}
        </InlineAlert>
      )}

      {expanded && !hasError && (
        <div id={panelId} className="mt-5 space-y-5">
          {loading && (
            <div className="flex justify-center py-6">
              <output aria-label="Chargement des candidatures">
                <Spinner className="h-6 w-6 border-primary/20 border-t-primary" />
              </output>
            </div>
          )}

          {!loading && candidateCount === 0 && (
            <p className="rounded-xl border border-border bg-background/40 px-4 py-6 text-center text-sm text-muted">
              Aucune candidature pour le moment.
            </p>
          )}

          {!loading &&
            applications?.map((application) => (
              <ReceivedApplicationCard
                key={application.id}
                application={application}
              />
            ))}

          {/* A loaded page is not the whole list: the endpoint pages at ten, so
              a busy posting would silently stop here. The link carries the real
              total instead of letting the panel pass itself off as complete. */}
          {!loading && truncated && (
            <p className="pt-1 text-center text-xs text-muted">
              <Link
                href={`/listings/mine/${listing.id}`}
                className="font-medium text-muted underline underline-offset-2 transition-colors hover:text-foreground"
              >
                {candidateCount} candidature{plural(candidateCount)} affichée
                {plural(candidateCount)} sur {received?.total}
              </Link>
            </p>
          )}
        </div>
      )}

      {recruiting && (
        <div className="mt-5 border-t border-border pt-4">
          <ListingActions
            activeCount={listing.applicationsCount}
            acting={acting}
            onClose={onClose}
            onCancel={onCancel}
          />
        </div>
      )}
    </Card>
  );
}
