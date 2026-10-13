import { FileTextIcon, UsersIcon } from "@/components/atoms/icons";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { EmptyState } from "@/components/organisms/empty-state";
import { MyListingsRail } from "@/components/organisms/my-listings-rail";
import {
  MyListingsMobileList,
  MyListingsTable,
} from "@/components/organisms/my-listings-table";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";
import {
  countForFilter,
  LISTING_FILTERS,
  type ListingApplicationsData,
  type ListingMessage,
  type ListingStatusCounts,
  type ListingsFilter,
  type MyListing,
} from "@/lib/listings";

export interface MyListingsViewProps {
  listings: MyListing[];
  /** Totals over the whole collection — the only source of the rail's aggregates. */
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
   * Failure, scoped to one listing. The id is part of the value so a row can
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

/**
 * The board's own shell: the same full-height geometry the browse feed uses.
 *
 * `py` kept to a minimum and the width widened past the console default, for the
 * same reason there — the point of the screen is to show as much of the
 * collection at once as the window allows. Below `lg` none of that holds: there
 * is no height to fill and the rail would sit beside a squeezed table, so it is
 * ordinary document flow — rail first, then the card — and the page scrolls.
 */
const SHELL = cn(
  SITE_SHELL,
  "flex flex-col gap-4 py-4",
  "lg:h-full lg:min-h-0 lg:flex-1 lg:gap-3 lg:py-3",
);

/**
 * The practice's board — the same shell as the browse feed, filled with what
 * this screen owns.
 *
 * Three zones, the reference's own: a rail of summary panels down the left, and
 * one card across the rest holding the buckets above the listings. The card is
 * `flex-1` and carries the table, which scrolls inside it, so the page never
 * scrolls and a practice with three postings and a practice with forty see the
 * same board.
 *
 * The `PageHeader` this replaces is gone rather than restyled: the reference's
 * main card carries its own title, and a page title above a card that is also
 * titled is the same sentence twice on one screen.
 */
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
  /*
   * The buckets become the reference's tabs: one track with the active bucket as
   * a cream pill. The counts are already totals over the whole collection, so
   * they belong to the tab and not to the page under it — the reader changes
   * bucket *because* of the number on it.
   *
   * `SegmentedControl` rather than `FilterChips`: nine free-standing chips on a
   * wrapping row is a bundle, where nine options inside one track with the
   * selection filled reads as one control, and scrolls horizontally on a phone
   * instead of taking four floors.
   */
  const buckets = LISTING_FILTERS.map((option) => ({
    id: option.id,
    label: option.label,
    count: countForFilter(option, counts),
  }));

  return (
    <div className={SHELL}>
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-3">
        <div className="order-2 lg:order-1 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:pr-1">
          <MyListingsRail listings={listings} counts={counts} />
        </div>

        <div className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0 lg:flex-1">
          <Panel
            fill
            className="lg:flex-1"
            title="Mes offres"
            action={
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                {/*
                  Urgency is orthogonal to the status buckets — a posting can be
                  urgent and closed — so it is a toggle beside the tabs rather
                  than a tenth bucket. It carries no counter: the endpoint breaks
                  its totals down by status only, and a « (0) » that meant « the
                  server did not send this » would be worse than no number.
                */}
                <button
                  type="button"
                  className={cn(
                    "chip min-h-0 shrink-0 whitespace-nowrap px-3 py-1.5",
                    urgentOnly && "is-active",
                  )}
                  aria-pressed={urgentOnly}
                  onClick={onUrgentToggle}
                >
                  Urgentes
                </button>

                <SegmentedControl
                  ariaLabel="Filtrer les annonces par situation"
                  options={buckets}
                  value={currentFilter}
                  onChange={onFilterChange}
                />
              </div>
            }
          >
            {/*
              Two presentations, one removed by CSS: `display:none` also takes it
              out of the accessibility tree, so a screen reader and a keyboard
              never meet the copy that is not on screen.
            */}
            <div className="flex min-h-[20rem] flex-col sm:min-h-[24rem] lg:min-h-0 lg:flex-1">
              {counts.total === 0 ? (
                <div className="flex flex-1 items-center">
                  <EmptyState
                    className="mt-0 w-full"
                    icon={<FileTextIcon className="h-8 w-8 text-primary" />}
                    title="Aucune annonce publiée"
                    description="Vous n'avez pas encore d'annonce de remplacement. Publiez-en une pour recevoir des candidatures."
                  />
                </div>
              ) : listings.length === 0 ? (
                <div className="flex flex-1 items-center">
                  <EmptyState
                    className="mt-0 w-full"
                    icon={<UsersIcon className="h-8 w-8 text-primary" />}
                    title="Aucune annonce dans cette catégorie"
                    description={
                      urgentOnly
                        ? "Aucune annonce urgente dans cette catégorie. Retirez le filtre « Urgentes » pour voir les autres."
                        : "Changez de filtre pour voir vos autres annonces."
                    }
                    // The way out, offered on the state that needs it: the reader
                    // who narrowed to urgent and found nothing has one filter to
                    // undo, so the button says exactly that.
                    actionLabel={
                      urgentOnly ? "Retirer le filtre Urgentes" : undefined
                    }
                    onAction={urgentOnly ? onUrgentToggle : undefined}
                  />
                </div>
              ) : (
                <>
                  <MyListingsTable
                    listings={listings}
                    receivedByListing={receivedByListing}
                    expandedListingId={expandedListingId}
                    loadingListingId={loadingListingId}
                    actingListingId={actingListingId}
                    actionError={actionError}
                    actionFeedback={actionFeedback}
                    onToggle={onToggle}
                    onClose={onClose}
                    onCancel={onCancel}
                  />

                  <MyListingsMobileList
                    listings={listings}
                    receivedByListing={receivedByListing}
                    expandedListingId={expandedListingId}
                    loadingListingId={loadingListingId}
                    actingListingId={actingListingId}
                    actionError={actionError}
                    actionFeedback={actionFeedback}
                    onToggle={onToggle}
                    onClose={onClose}
                    onCancel={onCancel}
                  />
                </>
              )}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
