/**
 * Presentation contracts for the "my listings" surface (`/listings/mine`).
 *
 * This is the practice side of the product: the listings the user published
 * and, per listing, the candidates who applied. Components depend only on
 * these types; the raw data is fetched and adapted by `./service`.
 */

import type {
  ApiApplication,
  ApplicationDecisionSource,
  ApplicationStatus,
  ProfileType,
  ReplacementListingStatus,
  Specialty,
  StatusCounts,
} from "@/lib/types/api";
import type { BadgeTone } from "@/lib/ui-tokens";

/** What one listing status is called, and how it is drawn. */
export interface ListingStatusMeta {
  /** The full name, as prose reads it. */
  label: string;
  /**
   * The terse name a fixed-width column can carry.
   *
   * Not a truncation of `label`: « Candidatures en cours » and « Clôturée sans
   * remplaçant » are both wider than a rail column, and a label cut mid-word is
   * worse than a terse one — the reader cannot tell which bar is theirs, and that
   * column is one of scan-and-match, not one of reading. The full name is the
   * row's `title`.
   */
  shortLabel: string;
  tone: BadgeTone;
  /** Whether a posting in this state can still receive an application. */
  recruiting: boolean;
}

/**
 * Everything the product knows about a listing status, in one row each.
 *
 * This was five tables: the label and tone in `./adapters`, the short labels in
 * the board's rail, the display order in that rail again, the recruiting set in
 * this file, and the icon as a `switch` beside it. Adding a status meant editing
 * five files, and the two of them that claimed to be exhaustive — both typed
 * `Record<keyof typeof LISTING_STATUS_META, …>` — were not: a key added to this
 * table compiled fine and rendered `undefined` where its label was read.
 *
 * `satisfies` is what fixes that, and it is the reason for `as const` alongside
 * it: the first makes an entry the type forgets a *type* error, the second keeps
 * each entry's own fields literal so `LISTING_STATUS.OPEN.tone` is `"info"` and
 * not `BadgeTone`.
 *
 * Key order is the display order — the rail draws the statuses in the sequence a
 * posting moves through them, and a separate array saying so would be one more
 * thing to forget to update.
 *
 * The icon is deliberately absent: it is a React component, and this module is
 * imported by everything including the server. It stays beside the rail that
 * draws it.
 */
export const LISTING_STATUS_META = {
  DRAFT: {
    label: "Brouillon",
    shortLabel: "Brouillon",
    tone: "neutral",
    recruiting: false,
  },
  OPEN: {
    label: "Ouverte",
    shortLabel: "Ouverte",
    tone: "info",
    recruiting: true,
  },
  IN_DISCUSSION: {
    label: "Candidatures en cours",
    shortLabel: "En discussion",
    tone: "warning",
    recruiting: true,
  },
  FULL: {
    label: "Complet",
    shortLabel: "Complet",
    tone: "warning",
    recruiting: true,
  },
  FILLED: {
    label: "Pourvue",
    shortLabel: "Pourvue",
    tone: "success",
    recruiting: false,
  },
  CLOSED: {
    label: "Clôturée",
    shortLabel: "Clôturée",
    tone: "neutral",
    recruiting: false,
  },
  CLOSED_NO_CANDIDATE: {
    label: "Clôturée sans remplaçant",
    shortLabel: "Sans remp.",
    tone: "neutral",
    recruiting: false,
  },
  CANCELLED: {
    label: "Annulée",
    shortLabel: "Annulée",
    tone: "danger",
    recruiting: false,
  },
} as const satisfies Record<ReplacementListingStatus, ListingStatusMeta>;

/** The statuses in the order a listing moves through them — `LISTING_STATUS_META`'s own keys. */
export const LISTING_STATUS_ORDER = Object.keys(
  LISTING_STATUS_META,
) as ReplacementListingStatus[];

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

/**
 * Statuses a listing can still receive an application on.
 *
 * Derived from the table rather than written out beside it: the flag on each row
 * is the same statement, and two lists of the same three statuses is a drift
 * waiting to happen — a status marked `recruiting: true` that this set did not
 * know about would be drawn as open here and closed everywhere else.
 */
export const RECRUITING_STATUSES: ReadonlySet<ReplacementListingStatus> =
  new Set(
    LISTING_STATUS_ORDER.filter((s) => LISTING_STATUS_META[s].recruiting),
  );

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
export type ListingStatusCounts = StatusCounts<ReplacementListingStatus>;

/** Per-status totals for the applications received on one listing. */
export type ReceivedApplicationCounts = StatusCounts<ApplicationStatus>;

/** Candidates received on a listing, plus the totals behind their filter. */
export interface ListingApplicationsData {
  applications: ReceivedApplication[];
  page: number;
  totalPages: number;
  total: number;
  /** Totals over the whole listing, independent of the active filter. */
  counts: ReceivedApplicationCounts;
}

/**
 * The outcome of one owner action, bound to the listing it concerns.
 *
 * A domain contract rather than a prop shape: the container produces it from a
 * mutation and the view keys its feedback banner off it. It used to be declared
 * on the view and imported *by* the container — the dependency pointing at the
 * presentation component from the orchestrator, which is the way round this
 * module exists to prevent.
 */
export interface ListingMessage {
  listingId: string;
  /** French sentence shown on success. */
  message: string;
}
