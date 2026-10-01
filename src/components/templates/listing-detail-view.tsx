import Link from "next/link";
import { ArrowLeftIcon, UsersIcon } from "@/components/atoms/icons";
import { FilterChips } from "@/components/molecules/filter-chips";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { Pagination } from "@/components/molecules/pagination";
import { ReceivedApplicationCard } from "@/components/molecules/received-application-card";
import { ListingDetail } from "@/components/organisms/listing-detail";
import { plural } from "@/lib/format";
import {
  countForReceivedFilter,
  type ListingApplicationsData,
  type MyListing,
  RECEIVED_FILTERS,
  type ReceivedApplicationsFilter,
} from "@/lib/listings";

export interface ListingDetailViewProps {
  listing: MyListing;
  received: ListingApplicationsData;
  receivedFilter: ReceivedApplicationsFilter;
  onReceivedFilterChange: (filter: ReceivedApplicationsFilter) => void;
  onPageChange: (page: number) => void;
  loading: boolean;
  acting: boolean;
  error?: string;
  feedback?: string;
  onClose: () => void;
  onCancel: () => void;
}

/**
 * Listing detail page — the record of the posting, then the candidates it
 * received with their own filter row.
 *
 * The two halves are the same page rather than a page and a tab: what a practice
 * opens this route for is always the pair « is it still out there » and « who
 * applied », and separating them put one behind a navigation step.
 */
export function ListingDetailView({
  listing,
  received,
  receivedFilter,
  onReceivedFilterChange,
  onPageChange,
  loading,
  acting,
  error,
  feedback,
  onClose,
  onCancel,
}: ListingDetailViewProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/listings/mine"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Retour à mes offres
      </Link>

      <div className="mt-8">
        <ListingDetail
          listing={listing}
          acting={acting}
          onClose={onClose}
          onCancel={onCancel}
        />
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <UsersIcon className="h-4 w-4 text-muted" />
            Candidatures reçues
          </h2>
          <p className="text-sm text-muted">
            {countLabel(received, receivedFilter)}
          </p>
        </div>

        {feedback && (
          <InlineAlert tone="success" className="mt-4">
            {feedback}
          </InlineAlert>
        )}

        {error && (
          <InlineAlert as="p" tone="danger" className="mt-4">
            {error}
          </InlineAlert>
        )}

        {/* The chips are the navigation of this section, so they are rendered in
            every state — including an empty listing. Hiding them behind
            `total > 0` turned the one screen a practice opens when it has *no*
            candidate into the one screen with nowhere to go: the row was gone,
            the bucket you were in was gone, and the section below it said
            nothing could be filtered. A row of counters reading (0) explains the
            empty state; a missing row just hides the structure. */}
        <FilterChips
          ariaLabel="Filtrer les candidats par statut"
          className="mt-4"
          options={RECEIVED_FILTERS.map((option) => ({
            ...option,
            count: countForReceivedFilter(option, received.counts),
          }))}
          value={receivedFilter}
          onChange={onReceivedFilterChange}
        />

        {loading ? (
          <p className="mt-6 text-center text-sm text-muted">
            Chargement des candidatures…
          </p>
        ) : received.total === 0 ? (
          <p className="mt-6 rounded-xl border border-border bg-background/40 px-4 py-6 text-center text-sm text-muted">
            {listing.status === "DRAFT"
              ? "Cette annonce est encore en brouillon : elle n'a pas été diffusée, donc aucune candidature ne peut encore arriver."
              : receivedFilter === "ALL"
                ? "Aucune candidature n'a été reçue pour cette annonce."
                : `Aucun candidat ${bucketLabel(receivedFilter).toLowerCase()}.`}
          </p>
        ) : received.applications.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-background/40 px-4 py-6 text-center">
            <p className="text-sm text-muted">
              Aucun candidat dans cette catégorie.
            </p>
            <button
              type="button"
              onClick={() => onReceivedFilterChange("ALL")}
              className="mt-3 text-sm font-medium text-primary underline underline-offset-2"
            >
              Revenir à tous les candidats
            </button>
          </div>
        ) : (
          <ul className="mt-6 space-y-5">
            {received.applications.map((application) => (
              <li key={application.id}>
                <ReceivedApplicationCard application={application} />
              </li>
            ))}
          </ul>
        )}

        {received.totalPages > 1 && (
          <Pagination
            currentPage={received.page}
            totalPages={received.totalPages}
            onPageChange={onPageChange}
          />
        )}
      </section>
    </div>
  );
}

/** Label of the selected bucket, lowercased into a sentence. */
function bucketLabel(filter: ReceivedApplicationsFilter): string {
  return (
    RECEIVED_FILTERS.find((option) => option.id === filter)?.label ?? "Tous"
  );
}

/**
 * The heading's count, scoped to what is on screen.
 *
 * `total` is the backend's count *for the active filter*, so « 0 candidature au
 * total » next to a « Présélectionnés » chip is a number about the bucket and not
 * about the posting. Naming the scope keeps the two from reading as a claim
 * about the listing.
 */
function countLabel(
  received: ListingApplicationsData,
  filter: ReceivedApplicationsFilter,
): string {
  if (filter === "ALL") {
    return `${received.total} candidature${plural(received.total)} au total`;
  }
  return `${received.total} candidat${plural(received.total)} ${bucketLabel(filter).toLowerCase()}`;
}
