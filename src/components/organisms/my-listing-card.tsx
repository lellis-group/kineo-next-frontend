import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import { CalendarIcon } from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { ReceivedApplicationCard } from "@/components/molecules/received-application-card";
import { ListingActions } from "@/components/organisms/listing-actions";
import {
  formatActiveApplications,
  formatCapacity,
  LISTING_STATUS_META,
  type MyListing,
  RECRUITING_STATUSES,
  type ReceivedApplication,
} from "@/lib/listings";

export interface MyListingCardProps {
  listing: MyListing;
  /** Candidates already loaded, or undefined while the panel is closed. */
  applications?: ReceivedApplication[];
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
 */
export function MyListingCard({
  listing,
  applications,
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
  const candidateCount = applications?.length ?? 0;
  const hasError = Boolean(error);

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-snug font-bold break-words text-foreground sm:text-lg">
            {listing.title}
          </h2>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted sm:text-sm">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
              <span className="truncate">{listing.dateRange}</span>
            </span>
            {capacity && <span className="shrink-0">{capacity}</span>}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {listing.urgent && <Badge tone="danger">Urgent</Badge>}
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="status-text">
          {formatActiveApplications(listing.applicationsCount)}
        </p>

        {/* Plain text toggle, the treatment the site uses for a secondary
            card action (`ActivityFeed`'s « Tout voir`). No chevron: the
            codebase has no disclosure-by-chevron anywhere, and the label plus
            `aria-expanded` already carry the state. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground self-start sm:self-auto"
        >
          {expanded ? "Masquer les candidatures" : "Voir les candidatures"}
        </button>
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
        <div className="mt-4 space-y-3">
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
