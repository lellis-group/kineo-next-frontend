/**
 * Presentation contracts for the "my listings" surface (`/listings/mine`).
 *
 * This is the practice side of the product: the listings the user published
 * and, per listing, the candidates who applied. Components depend only on
 * these types; the raw data is fetched and adapted by `./service`.
 */

import type {
  ApiApplication,
  ApiReplacementListing,
  ApplicationDecisionSource,
  ApplicationStatus,
  ProfileType,
  ReplacementListingStatus,
  Specialty,
} from "@/lib/types/api";
import type { BadgeTone } from "@/lib/ui-tokens";

/** Label + tone for a listing status, as shown on its card. */
export interface ListingStatusMeta {
  label: string;
  tone: BadgeTone;
}

/** A listing published by the user, with the counts needed to act on it. */
export interface MyListing {
  id: string;
  title: string;
  status: ReplacementListingStatus;
  specialty: Specialty;
  /** Formatted period — e.g. « Du 15 oct. au 30 oct. 2025 ». */
  dateRange?: string;
  /**
   * Raw ISO bounds, kept alongside `dateRange`.
   *
   * The formatted range is one string built for a line of text; the detail page
   * needs the two bounds apart (« Du 15 oct. au 30 oct. 2025 » → début, fin) and
   * needs to compare them with today to say whether a posting is behind it.
   * Re-parsing the French sentence to get them back is not an option.
   */
  startDate: string;
  endDate: string;
  description?: string;
  urgent: boolean;
  /** Active candidates (PENDING / SHORTLISTED) — the capacity that matters. */
  applicationsCount: number;
  maxApplications?: number;
  createdAt: string;
  /** Last write on the row, when the backend reports one. */
  updatedAt?: string;
}

/**
 * A candidate who applied to one of the user's listings.
 *
 * The `anonymized` case is not a display nicety: when a candidate erases their
 * account, every identifying field below is overwritten by the backend. Without
 * the flag the practice would see a nameless card and could not tell a bug from
 * an erasure.
 */
export interface ApplicationApplicant {
  /** « Anonyme » once the account is erased; the name before that. */
  displayName: string;
  city?: string;
  specialty: Specialty;
  profileType: ProfileType;
  verified: boolean;
  /** True once the candidate erased their account (art. 17 GDPR). */
  anonymized: boolean;
  /** Avatar, or null when the candidate erased their account. */
  image?: string;
}

/** One application received on a listing the user owns. */
export interface ReceivedApplication {
  id: string;
  status: ApplicationStatus;
  /** Who decided; null while the application is still open. */
  decisionSource: ApplicationDecisionSource | null;
  /** « Postulé il y a 3 jours ». */
  submittedLabel: string;
  message?: string;
  rejectionReason?: string;
  withdrawnReason?: string;
  /** True once the practice has opened the application (viewedAt set). */
  viewed: boolean;
  viewedAt?: string;
  applicant: ApplicationApplicant;
  /** Raw application, for the actions the backend still allows. */
  raw: ApiApplication;
}

/** Statuses a listing can still receive an application on. */
export const RECRUITING_STATUSES: ReadonlySet<ReplacementListingStatus> =
  new Set(["OPEN", "IN_DISCUSSION", "FULL"]);

/**
 * Filter buckets above the list.
 *
 * The same reasoning as the applications screen, applied to the practice side.
 * The backend has eight listing statuses, but a practice does not think in
 * them: what it wants is « which ones can still take someone », « which one did
 * I fill », « which ones died without a replacement ». The first cut of this row
 * had five buckets and threw three of those situations into « En cours » and two
 * into « Terminées » — `FULL` (capacity reached) and `IN_DISCUSSION` (candidates
 * coming in) are not the same morning, and a posting that ended with nobody
 * retained is not the same as one that was cancelled before it started.
 *
 * So the buckets cut the statuses the way the applicant screen cuts `REJECTED`:
 * one chip per situation, each naming the statuses behind it, and a counter that
 * sums those statuses out of the server's unfiltered totals. Filtering stays
 * server-side, so a bucket is never assembled in the browser from a page of
 * results and pagination keeps counting the right rows.
 *
 * `RECRUITING` is the union bucket and stays first after « Toutes »: it is the
 * one a practice comes back to every day, and it is also the set the close /
 * cancel gate and the dashboard headline are built on, so it must not be
 * re-derived anywhere else.
 */
export type ListingsFilter =
  | "ALL"
  | "RECRUITING"
  | "OPEN"
  | "IN_DISCUSSION"
  | "FULL"
  | "FILLED"
  | "NO_CANDIDATE"
  | "CLOSED"
  | "DRAFT";

export interface ListingsFilterOption {
  id: ListingsFilter;
  label: string;
  /** Backend statuses this bucket selects; empty means « no filter ». */
  statuses: ReplacementListingStatus[];
}

export const LISTING_FILTERS: readonly ListingsFilterOption[] = [
  { id: "ALL", label: "Toutes", statuses: [] },
  {
    id: "RECRUITING",
    label: "En cours",
    statuses: ["OPEN", "IN_DISCUSSION", "FULL"],
  },
  { id: "OPEN", label: "Ouvertes", statuses: ["OPEN"] },
  { id: "IN_DISCUSSION", label: "En discussion", statuses: ["IN_DISCUSSION"] },
  {
    id: "FULL",
    label: "Capacité atteinte",
    statuses: ["FULL"],
  },
  { id: "FILLED", label: "Pourvues", statuses: ["FILLED"] },
  {
    id: "NO_CANDIDATE",
    label: "Sans remplaçant",
    statuses: ["CLOSED_NO_CANDIDATE"],
  },
  {
    id: "CLOSED",
    label: "Terminées",
    // `CLOSED` is a filled posting taken out of circulation, `CANCELLED` one
    // abandoned. `CLOSED_NO_CANDIDATE` is deliberately absent — it has its own
    // chip, because « nobody was kept » and « nobody ever applied » are different
    // histories and the practice reading the second one is the one that needs
    // to publish again.
    statuses: ["CLOSED", "CANCELLED"],
  },
  { id: "DRAFT", label: "Brouillons", statuses: ["DRAFT"] },
] as const;

/**
 * Chips over the candidates received on one listing.
 *
 * One status per bucket, which is what makes the counters trivial: each reads a
 * single key of the per-status totals the endpoint already returns. The split by
 * decision source that the applicant screen offers is not available here — that
 * endpoint sends the status breakdown only, and inventing a second total from a
 * page of rows would give a number that changes as you page. The *reason* a
 * candidate was ruled on is still shown, per row, from the row's own
 * `decisionSource`.
 */
export type ReceivedApplicationsFilter =
  | "ALL"
  | "PENDING"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export interface ReceivedApplicationsFilterOption {
  id: ReceivedApplicationsFilter;
  label: string;
  /** Backend status filter; absent means « no filter ». */
  status?: ApplicationStatus;
}

export const RECEIVED_FILTERS: readonly ReceivedApplicationsFilterOption[] = [
  { id: "ALL", label: "Tous" },
  { id: "PENDING", label: "En attente", status: "PENDING" },
  { id: "SHORTLISTED", label: "Présélectionnés", status: "SHORTLISTED" },
  { id: "ACCEPTED", label: "Acceptés", status: "ACCEPTED" },
  { id: "REJECTED", label: "Refusés", status: "REJECTED" },
  { id: "WITHDRAWN", label: "Retirés", status: "WITHDRAWN" },
] as const;

/** Per-status totals over the whole collection, as returned by the backend. */
export type ListingStatusCounts = Record<
  ReplacementListingStatus | "total",
  number
>;

/** Per-status totals for the applications received on one listing. */
export type ReceivedApplicationCounts = Record<
  ApplicationStatus | "total",
  number
>;

/** Candidates received on a listing, plus the totals behind their filter. */
export interface ListingApplicationsData {
  applications: ReceivedApplication[];
  page: number;
  totalPages: number;
  total: number;
  /** Totals over the whole listing, independent of the active filter. */
  counts: ReceivedApplicationCounts;
}

/** Raw listing payload, re-exported so actions can work off the same object. */
export type { ApiReplacementListing, ReplacementListingStatus };
