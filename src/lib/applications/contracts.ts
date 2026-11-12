/**
 * Presentation contracts for `/applications` — the locum's own sent
 * applications.
 */

import type {
  ApiApplicationBucketCounts,
  ApiApplicationStatusCounts,
  ApplicationDecisionSource,
  ApplicationRejectionBucket,
  ApplicationStatus,
} from "@/lib/types/api";

/** Filter buckets above the list, each one backend status. */
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
  status?: ApplicationStatus;
}

export const APPLICATION_FILTERS: readonly ApplicationsFilterOption[] = [
  { id: "ALL", label: "Toutes" },
  { id: "PENDING", label: "En attente", status: "PENDING" },
  { id: "SHORTLISTED", label: "Présélectionnées", status: "SHORTLISTED" },
  { id: "ACCEPTED", label: "Acceptées", status: "ACCEPTED" },
  {
    // Every rejected application: the backend has no decision-source filter.
    id: "REFUSED",
    label: "Refusées",
    status: "REJECTED",
  },
  {
    id: "WITHDRAWN",
    label: "Retirées par vous",
    status: "WITHDRAWN",
  },
] as const;

/** Which situation is selected, or « ALL » for every rejection. */
export type RejectionSituationFilter = ApplicationRejectionBucket | "ALL";

export interface RejectionSituationOption {
  id: RejectionSituationFilter;
  label: string;
}

/**
 * The second chip row, shown while « Refusées » is selected. The backend
 * classifies and counts each row; these are labels for the values it sends.
 */
export const REJECTION_SITUATIONS: readonly RejectionSituationOption[] = [
  // Not « Toutes »: the row above has one with a different scope.
  { id: "ALL", label: "Tous les refus" },
  { id: "REFUSED", label: "Refusées par le cabinet" },
  { id: "PASSED_OVER", label: "Un autre candidat retenu" },
  { id: "POSTING_ENDED", label: "L'annonce a pris fin" },
] as const;

export interface ApplicationListingInfo {
  id: string;
  /** Falls back to « Annonce indisponible » when the listing is gone. */
  title: string;
  /** Formatted period — e.g. « Du 15 oct. au 30 oct. 2025 ». */
  dateRange?: string;
  remuneration?: string;
  description?: string;
  practiceName?: string;
  practiceCity?: string;
}

export interface ApplicationEntry {
  id: string;
  status: ApplicationStatus;
  decisionSource: ApplicationDecisionSource | null;
  createdAt: string;
  /** Relative label — e.g. « Postulé hier ». */
  submittedLabel: string;
  viewed: boolean;
  message?: string;
  rejectionReason?: string;
  /** Which situation a rejection is, as the backend named it; null otherwise. */
  rejectionBucket: ApplicationRejectionBucket | null;
  withdrawnReason?: string;
  viewedAt?: string;
  respondedAt?: string;
  listing: ApplicationListingInfo;
}

export interface ApplicationsData {
  /** Filtered total for the current status (drives pagination). */
  total: number;
  applications: ApplicationEntry[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  /** Server-computed totals over the whole collection, independent of the filter. */
  counts: ApiApplicationStatusCounts;
  /** Per-situation totals over the whole collection. */
  bucketCounts: ApiApplicationBucketCounts;
  /** Open applications the practice has not viewed yet, over the whole collection. */
  unseenOpenCount: number;
  /** Applications that got an answer, withdrawn excluded — the response rate's numerator. */
  respondedCount: number;
}
