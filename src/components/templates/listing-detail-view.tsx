"use client";

import { useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { BackLink } from "@/components/molecules/back-link";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterChips } from "@/components/molecules/filter-chips";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { Pagination } from "@/components/molecules/pagination";
import { Panel } from "@/components/molecules/panel";
import { ReceivedApplicationCard } from "@/components/molecules/received-application-card";
import {
  type ListingAction,
  ListingActionButtons,
  ListingActionConfirm,
} from "@/components/organisms/listing-actions";
import { ListingDetailRail } from "@/components/organisms/listing-detail-rail";
import { ReceivedApplicationsTable } from "@/components/organisms/received-applications-table";
import { isAwaitingDecision } from "@/lib/applications";
import { BOARD_SHELL } from "@/lib/layout";
import {
  countForReceivedFilter,
  LISTING_STATUS_META,
  type ListingApplicationsData,
  type MyListing,
  RECEIVED_FILTERS,
  RECRUITING_STATUSES,
  type ReceivedApplication,
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
  /** Decisions on one received application — write then re-read in one call. */
  onApplicationViewed: (applicationId: string) => Promise<void>;
  onApplicationShortlist: (applicationId: string) => Promise<void>;
  onApplicationAccept: (applicationId: string) => Promise<void>;
  onApplicationReject: (
    applicationId: string,
    reason: string | undefined,
  ) => Promise<void>;
}

/** Who to show first: the first candidate still waiting on a decision. */
function firstToDecide(
  applications: readonly ReceivedApplication[],
): ReceivedApplication | undefined {
  return (
    applications.find((entry) => isAwaitingDecision(entry.status)) ??
    applications[0]
  );
}

/**
 * The owner's page for one listing, as a console board: the take-down
 * actions beside the title, the posting and its recruiting down the rail, the candidates as a table, and the one picked in
 * a panel beside it with the decisions. Phones get the candidates as cards.
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
  onApplicationViewed,
  onApplicationShortlist,
  onApplicationAccept,
  onApplicationReject,
}: ListingDetailViewProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const [asking, setAsking] = useState<ListingAction | null>(null);
  const status = LISTING_STATUS_META[listing.status];
  const recruiting = RECRUITING_STATUSES.has(listing.status);

  // A filter or a page change can take the pick off screen: fall back.
  const selected =
    received.applications.find((entry) => entry.id === selectedId) ??
    firstToDecide(received.applications);

  const actionsFor = (application: ReceivedApplication) => ({
    onMarkViewed: () => onApplicationViewed(application.id),
    onShortlist: () => onApplicationShortlist(application.id),
    onAccept: () => onApplicationAccept(application.id),
    onReject: (reason: string | undefined) =>
      onApplicationReject(application.id, reason),
  });

  return (
    <div className={BOARD_SHELL}>
      <header className="flex flex-col gap-3 pt-2">
        <BackLink href="/listings/mine">Mes offres</BackLink>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="min-w-0 text-2xl leading-tight font-medium tracking-tight break-words sm:text-3xl">
              {listing.title}
            </h1>
            <div className="flex items-center gap-2">
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

          {/* Always drawn; disabled, with the reason, once out of circulation. */}
          <div className="flex shrink-0 flex-col gap-1.5 lg:items-end">
            <ListingActionButtons
              activeCount={listing.applicationsCount}
              acting={acting}
              available={recruiting}
              asking={asking}
              onAsk={setAsking}
              onClose={onClose}
              onCancel={onCancel}
            />
            {!recruiting && (
              <p className="text-xs text-muted">
                Cette annonce n&apos;est pas en diffusion : rien à clôturer ni à
                annuler.
              </p>
            )}
          </div>
        </div>
      </header>

      {recruiting && asking && (
        <ListingActionConfirm
          action={asking}
          activeCount={listing.applicationsCount}
          acting={acting}
          onConfirm={asking === "close" ? onClose : onCancel}
          onBack={() => setAsking(null)}
        />
      )}

      {(feedback || error) && (
        <div className="flex flex-col gap-2">
          {feedback && <InlineAlert tone="success">{feedback}</InlineAlert>}
          {error && (
            <InlineAlert as="p" tone="danger">
              {error}
            </InlineAlert>
          )}
        </div>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[22.5rem_minmax(0,1fr)]">
        {/* The candidates are the page's job: first on a phone, beside from `lg`. */}
        <div className="order-2 lg:order-1">
          <ListingDetailRail listing={listing} counts={received.counts} />
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
          <Panel
            title={
              <>
                Candidatures reçues{" "}
                <span className="text-muted tabular-nums">
                  {received.counts.total}
                </span>
              </>
            }
            action={
              // Rendered in every state: counters reading (0) explain an empty bucket.
              <FilterChips
                ariaLabel="Filtrer les candidats par statut"
                options={RECEIVED_FILTERS.map((option) => ({
                  ...option,
                  count: countForReceivedFilter(option, received.counts),
                }))}
                value={receivedFilter}
                onChange={onReceivedFilterChange}
              />
            }
          >
            {loading ? (
              <p className="py-10 text-center text-sm text-muted">
                Chargement des candidatures…
              </p>
            ) : received.total === 0 ? (
              <EmptyState
                fill
                title={
                  listing.status === "DRAFT"
                    ? "Annonce en brouillon"
                    : "Aucune candidature"
                }
                description={
                  listing.status === "DRAFT"
                    ? "Elle n'a pas été diffusée : aucune candidature ne peut encore arriver."
                    : receivedFilter === "ALL"
                      ? "Aucune candidature n'a été reçue pour cette annonce."
                      : "Aucun candidat dans cette catégorie."
                }
                actionLabel={
                  receivedFilter === "ALL"
                    ? undefined
                    : "Voir tous les candidats"
                }
                onAction={
                  receivedFilter === "ALL"
                    ? undefined
                    : () => onReceivedFilterChange("ALL")
                }
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <ReceivedApplicationsTable
                    applications={received.applications}
                    selectedId={selected?.id}
                    onSelect={setSelectedId}
                  />
                </div>

                {/* Phones: every candidate as a card, decisions included. */}
                <ul className="flex flex-col gap-3 sm:hidden">
                  {received.applications.map((application) => (
                    <li key={application.id}>
                      <ReceivedApplicationCard
                        application={application}
                        actions={actionsFor(application)}
                        className="px-5 py-5"
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}

            <Pagination
              currentPage={received.page}
              totalPages={received.totalPages}
              onPageChange={onPageChange}
              className="mt-3 lg:mt-4"
            />
          </Panel>

          {selected && !loading && (
            <Panel title="Candidature" className="hidden sm:block">
              <ReceivedApplicationCard
                // Remount per candidate: the decision form keeps local state.
                key={selected.id}
                application={selected}
                actions={actionsFor(selected)}
                className="rounded-none border-0 bg-transparent p-0 sm:p-0"
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
