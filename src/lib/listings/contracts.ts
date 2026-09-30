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
  description?: string;
  urgent: boolean;
  /** Active candidates (PENDING / SHORTLISTED) — the capacity that matters. */
  applicationsCount: number;
  maxApplications?: number;
  createdAt: string;
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
  /** « Postulé il y a 3 jours ». */
  submittedLabel: string;
  message?: string;
  rejectionReason?: string;
  withdrawnReason?: string;
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
 * Eight statuses would be unusable as eight chips, and a practice does not
 * think in them: what it wants is "the ones still recruiting", "the one I
 * filled", "the ones I closed". Each bucket maps to one or more backend
 * statuses, sent as a single comma-separated `status` query parameter so the
 * filtering stays server-side and pagination keeps working.
 */
export type ListingsFilter =
  | "ALL"
  | "RECRUITING"
  | "FILLED"
  | "CLOSED"
  | "DRAFT";

export interface ListingsFilterOption {
  id: ListingsFilter;
  label: string;
  /** Backend statuses this bucket selects; empty means « no filter ». */
  statuses: ReplacementListingStatus[];
}

/** Filter row configuration — same shape as the applications screen. */
export const LISTING_FILTERS: readonly ListingsFilterOption[] = [
  { id: "ALL", label: "Toutes", statuses: [] },
  {
    id: "RECRUITING",
    label: "En cours",
    statuses: ["OPEN", "IN_DISCUSSION", "FULL"],
  },
  { id: "FILLED", label: "Pourvue", statuses: ["FILLED"] },
  {
    id: "CLOSED",
    label: "Terminées",
    // `CLOSED_NO_CANDIDATE` belongs here: `close` writes it when the owner
    // took a posting out of circulation without retaining anyone, and the
    // applicant is told so in their rejection reason. Leaving it out would make
    // those listings unreachable from every bucket.
    statuses: ["CLOSED", "CLOSED_NO_CANDIDATE", "CANCELLED"],
  },
  { id: "DRAFT", label: "Brouillons", statuses: ["DRAFT"] },
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
