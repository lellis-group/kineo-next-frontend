import { UsersIcon } from "@/components/atoms/icons";
import { FilterChips } from "@/components/molecules/filter-chips";
import { EmptyState } from "@/components/organisms/empty-state";
import { MyListingCard } from "@/components/organisms/my-listing-card";
import {
  countForFilter,
  LISTING_FILTERS,
  type ListingStatusCounts,
  type ListingsFilter,
  type MyListing,
  type ReceivedApplication,
} from "@/lib/listings";

/** A message bound to the listing it concerns. */
export interface ListingMessage {
  listingId: string;
  message: string;
}

export interface MyListingsViewProps {
  listings: MyListing[];
  /** Totals over the whole collection — the only source of the chip counters. */
  counts: ListingStatusCounts;
  currentFilter: ListingsFilter;
  onFilterChange: (filter: ListingsFilter) => void;
  /** Candidates per listing id, present only for the expanded listing. */
  applicationsByListing: Record<string, ReceivedApplication[]>;
  loadingListingId?: string;
  expandedListingId?: string;
  /**
   * Failure, scoped to one listing. The id is part of the value so a card can
   * only ever render the message that concerns it — a bare string here would
   * be painted on every card in the list.
   */
  actionError?: ListingMessage | null;
  /** Confirmation after a close/cancel, scoped the same way. */
  actionFeedback?: ListingMessage | null;
  actingListingId?: string;
  onToggle: (listingId: string) => void;
  onClose: (listingId: string) => void;
  onCancel: (listingId: string) => void;
}

/** Presentational list of the user's listings, each expandable into candidates. */
export function MyListingsView({
  listings,
  counts,
  currentFilter,
  onFilterChange,
  applicationsByListing,
  loadingListingId,
  expandedListingId,
  actionError,
  actionFeedback,
  actingListingId,
  onToggle,
  onClose,
  onCancel,
}: MyListingsViewProps) {
  const isFiltered = currentFilter !== "ALL";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <MyListingsHeader />

      {counts.total === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-8 w-8 text-primary" />}
          title="Aucune annonce publiée"
          description="Vous n'avez pas encore d'annonce de remplacement. Publiez-en une pour recevoir des candidatures."
        />
      ) : (
        <>
          <FilterChips
            ariaLabel="Filtrer les annonces par état"
            className="mt-6"
            options={LISTING_FILTERS.map((option) => ({
              ...option,
              count: countForFilter(option, counts),
            }))}
            value={currentFilter}
            onChange={onFilterChange}
          />

          {listings.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-8 w-8 text-primary" />}
              title="Aucune annonce dans cette catégorie"
              description="Changez de filtre pour voir vos autres annonces."
            />
          ) : (
            <ul className="mt-8 space-y-5">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <MyListingCard
                    listing={listing}
                    applications={applicationsByListing[listing.id]}
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

          {/* A filter that hides everything is a dead end without a way back. */}
          {isFiltered && listings.length === 0 && (
            <output className="sr-only">
              Aucune annonce ne correspond à ce filtre.
            </output>
          )}
        </>
      )}
    </div>
  );
}

function MyListingsHeader() {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Mes offres
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Suivez vos annonces et traitez les candidatures qu&apos;elles reçoivent.
      </p>
    </header>
  );
}
