import { Fragment, forwardRef, useImperativeHandle, useRef } from "react";
import { Badge } from "@/components/atoms/badge";
import {
  CalendarIcon,
  ChevronDownIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { ReceivedApplicationCard } from "@/components/molecules/received-application-card";
import { SoftPanel } from "@/components/molecules/soft-panel";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { ListingActions } from "@/components/organisms/listing-actions";
import { MyListingCard } from "@/components/organisms/my-listing-card";
import { cn } from "@/lib/cn";
import { formatDayMonth, plural } from "@/lib/format";
import {
  formatCapacity,
  formatListingAge,
  LISTING_STATUS_META,
  type ListingApplicationsData,
  type ListingMessage,
  type MyListing,
} from "@/lib/listings";
import { SPECIALTY_SHORT_LABELS } from "@/lib/profile";

/**
 * What the table lets the screen do to its rows.
 *
 * The same handle the browse table exposes, and for the same reason: the screen
 * may one day want to scroll a row into view, and a row is this table's markup,
 * not the container's business.
 */
export interface MyListingsTableHandle {
  scrollToId: (id: string) => boolean;
}

interface MyListingsTableProps {
  listings: readonly MyListing[];
  /** Candidates per listing id, present only for the expanded listing. */
  receivedByListing: Record<string, ListingApplicationsData>;
  expandedListingId?: string;
  loadingListingId?: string;
  actingListingId?: string;
  /** Failure, scoped to one listing. */
  actionError?: ListingMessage | null;
  /** Confirmation after a close/cancel, scoped the same way. */
  actionFeedback?: ListingMessage | null;
  onToggle: (listingId: string) => void;
  onClose: (listingId: string) => void;
  onCancel: (listingId: string) => void;
}

/**
 * The practice's listings, as the reference's orders table.
 *
 * One row per posting, expandable in place. The expansion is the important
 * departure from the reference, whose rows have nothing underneath them: this
 * screen's job is triage — a practice looks at a posting and decides what to do
 * with the candidates on it — so the candidate list opens *under* its own row
 * rather than on another page, and the row grows by the height of what it holds.
 *
 * Detail (title, meta, actions) is not repeated twice for the same reason the
 * browse table does not repeat the listing: below `sm` the six columns do not
 * fit and `MyListingCard` is the row, rendered from the same data.
 */
export const MyListingsTable = forwardRef<
  MyListingsTableHandle,
  MyListingsTableProps
>(function MyListingsTable(
  {
    listings,
    receivedByListing,
    expandedListingId,
    loadingListingId,
    actingListingId,
    actionError,
    actionFeedback,
    onToggle,
    onClose,
    onCancel,
  },
  ref,
) {
  const tableRef = useRef<HTMLTableElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToId: (id: string) => {
        const row = tableRef.current?.querySelector<HTMLElement>(
          `tbody tr[data-listing-id="${id}"]`,
        );
        if (!row) return false;
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      },
    }),
    [],
  );

  /*
   * `scrollbar-gutter: stable` and `min-h-0 overflow-auto`: the table is the
   * scrolling region of a card in a full-height workspace, so a full board's rows
   * move inside it instead of deciding how tall the page is.
   *
   * It sizes itself to its rows, though, rather than to the card. `h-full` — as
   * it was — drew the frame down to the bottom of the card whatever the posting
   * count, and a practice with two of its own offers was looking at a bordered
   * box with an empty lower half. Sized by its content the frame is exactly the
   * rows, and the space below it belongs to the panel.
   *
   * `min-h-0` is what keeps the long case working: a flex item's `min-height`
   * defaults to its content, so without it the frame would refuse to shrink,
   * push past the card and take the pager off screen. With it, a long board is
   * capped at the height the card gives it and scrolls; a short one is its own
   * height. The same fix as the browse feed's table, for the same reason.
   */
  return (
    <div className="hidden min-h-0 overflow-auto rounded-xl border border-border [scrollbar-gutter:stable] sm:block">
      <table ref={tableRef} className="table listings-table">
        <thead>
          <tr>
            <th scope="col" className="has-gutter">
              Annonce
            </th>
            <th scope="col">Statut</th>
            <th scope="col" className="has-gutter">
              Période
            </th>
            <th scope="col" className="has-gutter">
              Candidats
            </th>
            <th scope="col">Publication</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => {
            const expanded = expandedListingId === listing.id;
            const status = LISTING_STATUS_META[listing.status];

            return (
              <Fragment key={listing.id}>
                <tr
                  data-listing-id={listing.id}
                  className={cn("row-enter", expanded && "bg-surface-2")}
                >
                  <td>
                    <div className="flex items-start gap-[var(--cell-gap)]">
                      <SpecialtyIcon
                        specialty={listing.specialty}
                        className="size-[var(--cell-icon)] shrink-0 text-primary"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-medium leading-[var(--cell-icon)] text-foreground">
                          {listing.title}
                        </p>
                        <p className="text-xs text-muted">
                          {SPECIALTY_SHORT_LABELS[listing.specialty]}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="flex h-[var(--cell-icon)] items-center">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </span>
                  </td>

                  {/*
                    The period on two lines, the way the reference draws a route:
                    a start above, an end below, the arrow standing in for
                    « Du … au … ». A range worded out is the one column whose text
                    wraps, and it would make its own row the tall one.
                  */}
                  <td>
                    <span
                      className="inline-flex items-start gap-[var(--cell-gap)] whitespace-nowrap text-muted"
                      title={listing.dateRange}
                    >
                      <CalendarIcon className="mt-[0.125rem] size-[var(--cell-icon)] shrink-0" />
                      <span className="flex flex-col">
                        <span className="leading-[var(--cell-icon)]">
                          {formatDayMonth(listing.startDate)}
                        </span>
                        <span className="text-xs leading-tight text-faint">
                          → {formatDayMonth(listing.endDate)}
                        </span>
                      </span>
                    </span>
                  </td>

                  <td>
                    {/*
                      Candidates as « 3 / 5 » — the figure and the cap on one line,
                      tabular so a column of them lines up. Uncapped postings show
                      the figure alone rather than « 3 / ∞ ».
                    */}
                    <span
                      className="inline-flex items-center gap-[var(--cell-gap)] whitespace-nowrap leading-[var(--cell-icon)] text-muted tabular-nums"
                      title={formatCapacity(
                        listing.applicationsCount,
                        listing.maxApplications,
                      )}
                    >
                      <UsersIcon className="size-[var(--cell-icon)] shrink-0" />
                      {listing.applicationsCount}
                      {listing.maxApplications
                        ? ` / ${listing.maxApplications}`
                        : ""}
                    </span>
                  </td>

                  <td className="leading-[var(--cell-icon)] text-muted">
                    {/*
                      One line, truncated rather than wrapped: the reference's
                      ETA column is a single short date, and a column that folds
                      to two lines makes its own row the tall one. The full
                      sentence is the cell's `title`.
                    */}
                    <span
                      className="block truncate"
                      title={formatListingAge(listing)}
                    >
                      {formatListingAge(listing)}
                    </span>
                  </td>

                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {/*
                        Plain text toggle, the treatment this codebase uses for a
                        secondary card action. The chevron is driven by
                        `aria-expanded` rather than being the state itself: the
                        label changes (« Voir » / « Masquer »), which is what a
                        screen reader is told.
                      */}
                      <button
                        type="button"
                        onClick={() => onToggle(listing.id)}
                        aria-expanded={expanded}
                        aria-controls={`listing-candidates-${listing.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                      >
                        <ChevronDownIcon
                          className={cn(
                            "size-3.5 transition-transform duration-150",
                            expanded && "rotate-180",
                          )}
                        />
                        {expanded ? "Masquer" : "Voir"}
                      </button>
                    </div>
                  </td>
                </tr>

                {expanded && (
                  <ListingDetailRow
                    listing={listing}
                    panelId={`listing-candidates-${listing.id}`}
                    received={receivedByListing[listing.id]}
                    loading={loadingListingId === listing.id}
                    acting={actingListingId === listing.id}
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
                    onClose={() => onClose(listing.id)}
                    onCancel={() => onCancel(listing.id)}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

/**
 * The panel one listing's candidates live in — the row underneath its own.
 *
 * A full-width `td` spanning the six columns, so the panel belongs to the row
 * above it: a practice reads « Voir les candidatures » and the answer appears
 * under the question, with the posting's own line still in view above it.
 *
 * Everything the collapsed card used to carry is here — the candidate list, the
 * loading state, the capped-list note, the failure and the confirmation, and the
 * terminal actions with their warning.
 */
function ListingDetailRow({
  listing,
  panelId,
  received,
  loading,
  acting,
  error,
  feedback,
  onClose,
  onCancel,
}: {
  listing: MyListing;
  panelId: string;
  received?: ListingApplicationsData;
  loading?: boolean;
  acting?: boolean;
  error?: string;
  feedback?: string;
  onClose: () => void;
  onCancel: () => void;
}) {
  const candidates = received?.applications ?? [];
  // The panel holds one page, so it cannot claim to be the whole pipeline. The
  // remainder is named rather than hidden: a practice that reads five rows and
  // concludes nobody else applied is exactly the mistake this line prevents.
  const truncated = (received?.total ?? 0) > candidates.length;

  return (
    <tr data-listing-id={listing.id} className="bg-background/30">
      <td colSpan={6} id={panelId} className="p-0 align-top">
        <div className="flex flex-col gap-4 border-t border-border px-5 py-5 sm:px-6">
          {feedback && <InlineAlert tone="success">{feedback}</InlineAlert>}
          {error && (
            <InlineAlert as="p" tone="danger">
              {error}
            </InlineAlert>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <output aria-label="Chargement des candidatures">
                <Spinner className="h-6 w-6 border-primary/20 border-t-primary" />
              </output>
            </div>
          )}

          {!loading && candidates.length === 0 && (
            <SoftPanel as="p">Aucune candidature pour le moment.</SoftPanel>
          )}

          {!loading && (
            <ul className="flex flex-col gap-3">
              {candidates.map((application) => (
                <li key={application.id}>
                  <ReceivedApplicationCard application={application} />
                </li>
              ))}
            </ul>
          )}

          {!loading && truncated && (
            <p className="pt-1 text-center text-xs text-muted">
              {candidates.length} candidature{plural(candidates.length)}{" "}
              affichée
              {plural(candidates.length)} sur {received?.total}
            </p>
          )}

          {/*
            The terminal actions, which take the listing out of circulation and
            end every active application with it. They stay inside the panel on
            purpose: they belong to the posting whose candidates were just read.
          */}
          <div className="border-t border-border pt-4">
            <ListingActions
              activeCount={listing.applicationsCount}
              acting={acting}
              onClose={onClose}
              onCancel={onCancel}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

/**
 * The narrow-screen counterpart, from the same row.
 *
 * `MyListingCard` is that row without a table: it carries the same facts in the
 * same order and is a fuller surface for the same data. Both presentations are
 * rendered and one is removed by CSS, which is not the same as being hidden:
 * `display:none` also takes it out of the accessibility tree.
 */
export function MyListingsMobileList({
  listings,
  receivedByListing,
  expandedListingId,
  loadingListingId,
  actingListingId,
  actionError,
  actionFeedback,
  onToggle,
  onClose,
  onCancel,
}: MyListingsTableProps) {
  return (
    <ul className="flex flex-col gap-3 sm:hidden">
      {listings.map((listing) => (
        <li key={listing.id}>
          <MyListingCard
            listing={listing}
            received={receivedByListing[listing.id]}
            loading={loadingListingId === listing.id}
            expanded={expandedListingId === listing.id}
            acting={actingListingId === listing.id}
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
  );
}
