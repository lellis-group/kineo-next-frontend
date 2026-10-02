/**
 * Presentation-layer contracts for the applications tracking page
 * (`/applications` — the locum's own sent applications).
 * Components depend only on these types; the raw data is fetched and
 * adapted by the applications service (`./service`).
 */

import type {
  ApiApplicationDecisionCounts,
  ApiApplicationStatusCounts,
  ApplicationDecisionSource,
  ApplicationStatus,
} from "@/lib/types/api";

/**
 * Keys of `decisionCounts` a bucket can be counted from: every decision source
 * plus `undecided`, the applications nobody has ruled on. Typing them means a
 * typo in a bucket is a compile error rather than a counter that silently reads
 * zero.
 */
export type DecisionCountKey = keyof ApiApplicationDecisionCounts;

/**
 * Filter buckets above the list.
 *
 * These are situations, not statuses. « Rejetées » grouped four things that
 * read nothing alike to the applicant: another candidate was retained, the
 * practice refused this person, the posting closed with nobody chosen, and the
 * practice gave up on the replacement entirely. A chip counting all of them told
 * them nothing about which had happened.
 *
 * Each bucket names a status and the decision sources that belong to it, which
 * the backend filters on directly, so a bucket is never assembled in the browser
 * from a page of results.
 */
export type ApplicationsFilter =
  | "ALL"
  | "PENDING"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "PASSED_OVER"
  | "REFUSED"
  | "POSTING_ENDED"
  | "WITHDRAWN";

export interface ApplicationsFilterOption {
  id: ApplicationsFilter;
  label: string;
  /** Backend status filter, comma-separated when the bucket spans several. */
  status?: string;
  /** Backend decision-source filter, comma-separated when several. */
  decisionSource?: string;
  /**
   * Keys in `decisionCounts` to sum for the chip's counter.
   *
   * Declared only by the buckets the backend narrows with a `decisionSource`.
   * A bucket that sends no `decisionSource` must leave this undefined and be
   * counted from `counts` instead, because otherwise the chip counts a
   * *different set* from the one the list below it shows — and nothing on screen
   * says so. The reader sees « Retirées par vous (0) » over three rows, and the
   * only way to know whether the number or the list is wrong is to go and look.
   *
   * A bucket needs `countKeys` exactly when its `status` alone does not identify
   * it: the three `REJECTED` buckets are each one decision source, so each needs
   * both. `WITHDRAWN` is the only bucket whose status is unique to it, and the
   * status totals already answer it.
   */
  countKeys?: readonly DecisionCountKey[];
}

/**
 * The owner actions that end a posting — the practice closed the listing,
 * closed it without picking anyone, cancelled it, or erased it.
 *
 * Declared once here because the « Annonce terminée » bucket needs this set in
 * two shapes at once: the backend filters on a comma-separated string, while
 * the chip's counter sums `decisionCounts` keys. Both are derived from this one
 * list, because the pair used to be hand-written side by side and nothing
 * checked them against each other — adding a fifth way to end a posting would
 * have updated the counter and left the filter behind, which is the kind of
 * drift that shows up as a chip that never quite agrees with the list under it.
 */
const POSTING_ENDED_SOURCES = [
  "LISTING_CLOSED",
  "LISTING_CLOSED_NO_CANDIDATE",
  "LISTING_CANCELLED",
  "LISTING_ERASED",
] as const satisfies readonly ApplicationDecisionSource[];

/** `"A,B,C"` — the query shape the backend filters on. */
function csv(values: readonly string[]): string {
  return values.join(",");
}

export const APPLICATION_FILTERS: readonly ApplicationsFilterOption[] = [
  { id: "ALL", label: "Toutes" },
  // No `countKeys`: these three are exactly one status, and the status totals
  // already answer them. Pointing them at `undecided` would have given both
  // chips the same number — the union of the two, since a decisionSource is null
  // for every open application whichever side of the shortlist it is on.
  { id: "PENDING", label: "En attente", status: "PENDING" },
  { id: "SHORTLISTED", label: "Présélectionnées", status: "SHORTLISTED" },
  { id: "ACCEPTED", label: "Acceptées", status: "ACCEPTED" },
  {
    id: "PASSED_OVER",
    label: "Un autre candidat retenu",
    status: "REJECTED",
    decisionSource: "ANOTHER_CANDIDATE_SELECTED",
    countKeys: ["ANOTHER_CANDIDATE_SELECTED"],
  },
  {
    id: "REFUSED",
    label: "Refusées par le cabinet",
    status: "REJECTED",
    decisionSource: "PRACTICE_REJECTED",
    countKeys: ["PRACTICE_REJECTED"],
  },
  {
    id: "POSTING_ENDED",
    label: "Annonce terminée",
    status: "REJECTED",
    decisionSource: csv(POSTING_ENDED_SOURCES),
    countKeys: POSTING_ENDED_SOURCES,
  },
  {
    id: "WITHDRAWN",
    label: "Retirées par vous",
    status: "WITHDRAWN",
    // No `countKeys`, on purpose — see the note on the type below. This bucket
    // is defined by its status, so it is counted from `counts.WITHDRAWN`, like
    // the three single-status buckets above.
  },
] as const;

/** The listing an application was sent to (embedded by the backend). */
export interface ApplicationListingInfo {
  id: string;
  /** Listing title — falls back to « Annonce indisponible » when the listing is gone. */
  title: string;
  /** Formatted period — e.g. « Du 15 oct. au 30 oct. 2025 ». */
  dateRange?: string;
  remuneration?: string;
  /** Listing description — rendered on the dedicated detail page. */
  description?: string;
  practiceName?: string;
  practiceCity?: string;
}

/** One of the user's own applications — feeds both the card and the detail panel. */
export interface ApplicationEntry {
  id: string;
  status: ApplicationStatus;
  /** Who decided; null while the application is still open. */
  decisionSource: ApplicationDecisionSource | null;
  /** ISO timestamp of submission (raw, for detail rendering). */
  createdAt: string;
  /** Relative label — e.g. « Postulé hier ». */
  submittedLabel: string;
  /** True when the practice has opened the application (viewedAt set). */
  viewed: boolean;
  /** Message sent with the application, trimmed (undefined when empty). */
  message?: string;
  rejectionReason?: string;
  withdrawnReason?: string;
  viewedAt?: string;
  respondedAt?: string;
  listing: ApplicationListingInfo;
}

export interface ApplicationsData {
  /** Filtered total for the current status (drives pagination). */
  total: number;
  /** Entries sorted by most recent submission first. */
  applications: ApplicationEntry[];
  /** Pagination metadata. */
  pagination: {
    /** Current page number (1-based). */
    page: number;
    /** Number of items per page. */
    limit: number;
    /** Total number of pages. */
    totalPages: number;
  };
  /**
   * Server-computed totals over the WHOLE collection, independent of the
   * applied status filter and of the current page. The status tabs render
   * these numbers only — they are never derived from `applications`.
   */
  counts: ApiApplicationStatusCounts;
  /**
   * Totals per decision source over the whole collection, like `counts`. The
   * chip counters sum from this rather than from `counts`, because the buckets
   * cut across statuses.
   *
   * Optional, not because the service leaves it out — it always fills it — but
   * because an older backend does not send it, and a rolling deploy must not
   * take the page down over a counter. Every reader treats it as possibly
   * absent and falls back to zero; that shows an empty counter rather than a
   * TypeError.
   */
  decisionCounts?: ApiApplicationDecisionCounts;
}
