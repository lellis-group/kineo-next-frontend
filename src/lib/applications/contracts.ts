/**
 * Presentation-layer contracts for the applications tracking page
 * (`/applications` — the locum's own sent applications).
 * Components depend only on these types; the raw data is fetched and
 * adapted by the applications service (`./service`).
 */

import type {
  ApiApplicationStatusCounts,
  ApplicationDecisionSource,
  ApplicationStatus,
} from "@/lib/types/api";

/**
 * Filter buckets above the list.
 *
 * These are situations, not statuses. « Rejetées » grouped four things that
 * read nothing alike to the applicant: another candidate was retained, the
 * practice refused this person, the posting closed with nobody chosen, and the
 * practice gave up on the replacement entirely. A chip counting all of them told
 * them nothing about which had happened.
 *
 * Each bucket names a status the backend filters on directly, so a bucket is
 * never assembled in the browser from a page of results.
 *
 * Only statuses, though. These buckets used to name decision sources as well,
 * which the backend rejects as an unrecognised key, and which named four
 * outcomes its `DecisionSource` enum cannot express. There were three buckets
 * involved and none of them worked.
 */
export type ApplicationsFilter =
  | "ALL"
  | "PENDING"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "REFUSED"
  | "WITHDRAWN";

export interface ApplicationsFilterOption {
  id: ApplicationsFilter;
  label: string;
  /** Backend status filter, comma-separated when the bucket spans several. */
  status?: string;
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
    // Label says « refused », not « refused by the practice»: the backend has no
    // decision-source filter, so this bucket is every rejected application and
    // cannot promise which of them were a judgement of the applicant. It used to
    // claim the narrower thing and send a `decisionSource` the backend rejects —
    // the chips above it were worse, filtering on sources the database has no
    // value for. Each row carries its own reason, which is where that
    // distinction is actually readable.
    id: "REFUSED",
    label: "Refusées",
    status: "REJECTED",
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
}
