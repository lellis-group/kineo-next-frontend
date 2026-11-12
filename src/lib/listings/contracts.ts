/**
 * Presentation contracts for the "my listings" surface (`/listings/mine`): the
 * listings the user published and, per listing, the candidates who applied.
 */

import type {
  ApiApplicationRow,
  ApplicationDecisionSource,
  ApplicationStatus,
  ProfileType,
  ReplacementListingStatus,
  Specialty,
  StatusCounts,
} from "@/lib/types/api";
import type { BadgeTone } from "@/lib/ui-tokens";

export interface ListingStatusMeta {
  label: string;
  /** The terse name a fixed-width rail column can carry; the full one is the row's `title`. */
  shortLabel: string;
  tone: BadgeTone;
  recruiting: boolean;
}

/**
 * Everything the product knows about a listing status. Key order is the display
 * order. The icon lives beside the rail: this module is imported by the server.
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

/** `LISTING_STATUS_META`'s keys, in the order a listing moves through them. */
export const LISTING_STATUS_ORDER = Object.keys(
  LISTING_STATUS_META,
) as ReplacementListingStatus[];

export interface MyListing {
  id: string;
  title: string;
  status: ReplacementListingStatus;
  specialty: Specialty;
  /** Formatted period — e.g. « Du 15 oct. au 30 oct. 2025 ». */
  dateRange?: string;
  /** Raw ISO bounds, for the detail page and the comparison with today. */
  startDate: string;
  endDate: string;
  description?: string;
  urgent: boolean;
  /** Active candidates (PENDING / SHORTLISTED) — the capacity that matters. */
  applicationsCount: number;
  maxApplications?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * A candidate who applied to one of the user's listings. `anonymized` tells an
 * erased account apart from a nameless card.
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

export interface ReceivedApplication {
  id: string;
  status: ApplicationStatus;
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
  raw: ApiApplicationRow;
}

/** Statuses a listing can still receive an application on. */
export const RECRUITING_STATUSES: ReadonlySet<ReplacementListingStatus> =
  new Set(
    LISTING_STATUS_ORDER.filter((s) => LISTING_STATUS_META[s].recruiting),
  );

/**
 * Filter buckets above the list: one chip per situation, each naming the
 * statuses behind it. Filtering stays server-side so pagination stays right.
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
    statuses: [...RECRUITING_STATUSES],
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
    // `CLOSED_NO_CANDIDATE` has its own chip: that practice needs to publish again.
    statuses: ["CLOSED", "CANCELLED"],
  },
  { id: "DRAFT", label: "Brouillons", statuses: ["DRAFT"] },
] as const;

/**
 * Chips over the candidates received on one listing. One status per bucket:
 * the endpoint only sends the status breakdown.
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

export type ListingStatusCounts = StatusCounts<ReplacementListingStatus>;

export type ReceivedApplicationCounts = StatusCounts<ApplicationStatus>;

export interface ListingApplicationsData {
  applications: ReceivedApplication[];
  page: number;
  totalPages: number;
  total: number;
  /** Totals over the whole listing, independent of the active filter. */
  counts: ReceivedApplicationCounts;
}

/** The outcome of one owner action, bound to the listing it concerns. */
export interface ListingMessage {
  listingId: string;
  message: string;
}
