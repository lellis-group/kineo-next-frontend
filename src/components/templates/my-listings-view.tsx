import { FileTextIcon, UsersIcon } from "@/components/atoms/icons";
import { PageHeader } from "@/components/atoms/page-header";
import { FilterChips } from "@/components/molecules/filter-chips";
import { Pagination } from "@/components/molecules/pagination";
import { EmptyState } from "@/components/organisms/empty-state";
import { MyListingCard } from "@/components/organisms/my-listing-card";
import { PAGE_CONTAINER } from "@/lib/layout";
import type { ListingMessage } from "@/lib/listings";
import {
  countForFilter,
  LISTING_FILTERS,
  type ListingApplicationsData,
  type ListingStatusCounts,
  type ListingsFilter,
  type MyListing,
} from "@/lib/listings";

export interface MyListingsViewProps {
  listings: MyListing[];
  /** Totals over the whole collection — the only source of the chip counters. */
  counts: ListingStatusCounts;
  currentFilter: ListingsFilter;
  onFilterChange: (filter: ListingsFilter) => void;
  /** Narrows any bucket to the postings flagged urgent. */
  urgentOnly: boolean;
  onUrgentToggle: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Candidates per listing id, present only for the expanded listing. */
  receivedByListing: Record<string, ListingApplicationsData>;
  loadingListingId?: string;
  expandedListingId?: string;
  /**
   * Failure, scoped to one listing. The id is part of the value so a card can
   * only ever render the message that concerns it — a bare string here would be
   * painted on every card in the list.
   */
  actionError?: ListingMessage | null;
  /** Confirmation after a close/cancel, scoped the same way. */
  actionFeedback?: ListingMessage | null;
  actingListingId?: string;
  onToggle: (listingId: string) => void;
  onClose: (listingId: string) => void;
  onCancel: (listingId: string) => void;
}

export function MyListingsView({
  listings,
  counts,
  currentFilter,
  onFilterChange,
  urgentOnly,
  onUrgentToggle,
  page,
  totalPages,
  onPageChange,
  receivedByListing,
  loadingListingId,
  expandedListingId,
  actionError,
  actionFeedback,
  actingListingId,
  onToggle,
  onClose,
  onCancel,
}: MyListingsViewProps) {
  return (
    <div className={PAGE_CONTAINER}>
      <MyListingsHeader />

      {counts.total === 0 ? (
        <EmptyState
          icon={<FileTextIcon className="h-8 w-8 text-primary" />}
          title="Aucune annonce publiée"
          description="Vous n'avez pas encore d'annonce de remplacement. Publiez-en une pour recevoir des candidatures."
        />
      ) : (
        <>
          <FilterChips
            ariaLabel="Filtrer les annonces par situation"
            className="mt-6"
            options={LISTING_FILTERS.map((option) => ({
              ...option,
              count: countForFilter(option, counts),
            }))}
            value={currentFilter}
            onChange={onFilterChange}
          />

          {/* Urgency is orthogonal to the status buckets — a posting can be
              urgent and closed — so it is a toggle next to the row rather than
              a tenth chip. It carries no counter: the endpoint breaks its totals
              down by status only, and a « (0) » that meant "the server did not
              send this" would be worse than no number at all. */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="chip"
              aria-pressed={urgentOnly}
              onClick={onUrgentToggle}
            >
              Urgentes seulement
            </button>
            {urgentOnly && (
              <p className="text-xs text-muted">
                Combiné avec «&nbsp;{bucketLabel(currentFilter)}&nbsp;».
              </p>
            )}
          </div>

          {listings.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-8 w-8 text-primary" />}
              title="Aucune annonce dans cette catégorie"
              description={
                urgentOnly
                  ? "Aucune annonce urgente dans cette catégorie. Retirez le filtre « Urgentes seulement » pour voir les autres."
                  : "Changez de filtre pour voir vos autres annonces."
              }
            />
          ) : (
            <ul className="mt-8 space-y-5">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <MyListingCard
                    listing={listing}
                    received={receivedByListing[listing.id]}
                    loading={loadingListingId === listing.id}
                    expanded={expandedListingId === listing.id}
                    acting={actingListingId === listing.id}
                    // Both messages are matched on their id: a card only ever
                    // speaks about itself.
                    error={
                      actionError?.listingId === listing.id
                        ? actionError.message
                        : undefined
                    }
                    feedback={
                      actionFeedback?.listingId === listing.id
                        ? actionFeedback.message
                        : undefined
                    }
                    onToggle={() => onToggle(listing.id)}
                    onClose={() => onClose(listing.id)}
                    onCancel={() => onCancel(listing.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Hidden for single-page results. The list is the one collection
              screen that had no way past its first twenty postings: a practice
              with more could see them all on no page at all. */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}

/** Label of the selected bucket, for the urgency reminder. */
function bucketLabel(filter: ListingsFilter): string {
  return (
    LISTING_FILTERS.find((option) => option.id === filter)?.label ?? "Toutes"
  );
}

function MyListingsHeader() {
  return (
    <PageHeader
      title="Mes offres"
      subtitle="Suivez vos annonces et traitez les candidatures qu&apos;elles reçoivent."
    />
  );
}
