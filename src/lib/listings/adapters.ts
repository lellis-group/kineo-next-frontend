/**
 * Adapters — turn raw API payloads into the presentation contracts of
 * `./contracts`.
 */

import { formatRelativeTime, percentOf, plural } from "../format";
import { SPECIALTY_LABELS, SPECIALTY_SHORT_LABELS } from "../profile";
import type {
  ApiApplicationRow,
  ApiReplacementListing,
  ApplicationDecisionSource,
  ApplicationStatus,
  ReplacementListingStatus,
} from "../types/api";
import type {
  ApplicationApplicant,
  ListingApplicationsData,
  ListingStatusCounts,
  ListingsFilter,
  MyListing,
  ReceivedApplication,
  ReceivedApplicationCounts,
  ReceivedApplicationsFilterOption,
} from "./contracts";
import {
  LISTING_FILTERS,
  LISTING_STATUS_META,
  LISTING_STATUS_ORDER,
  RECRUITING_STATUSES,
} from "./contracts";
import { adaptListingBase } from "./shared";

/** Shown in place of a name once the account is erased. */
const ANONYMIZED_APPLICANT_NAME = "Candidat anonymisé";

/** French labels per application status, as seen by the receiving practice. */
export const RECEIVED_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "En attente",
  SHORTLISTED: "Présélectionné",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  WITHDRAWN: "Retiré",
};

/**
 * Why the practice ruled the way it did, per row's `decisionSource`: a flat
 * « Refusé » would read as the practice's decision when the posting may have
 * been cancelled or closed. Mirrors `DECISION_SUMMARIES` on the applicant side.
 */
export const RECEIVED_DECISION_LABELS: Record<
  ApplicationDecisionSource,
  string
> = {
  CANDIDATE_WITHDREW: "Candidature retirée par le candidat",
  PRACTICE_ACCEPTED: "Acceptée par le cabinet",
  PRACTICE_REJECTED: "Refusée par le cabinet",
  SYSTEM: "Compte fermé",
};

export function adaptMyListings(
  listings: ApiReplacementListing[],
): MyListing[] {
  return listings.map(adaptMyListing);
}

export function adaptMyListing(listing: ApiReplacementListing): MyListing {
  const base = adaptListingBase(listing);
  return {
    ...base,
    status: listing.status,
    updatedAt: listing.updatedAt,
  };
}

/**
 * The backend blanks `user.name` and `user.image` on erasure, so only the
 * `anonymized` flag tells an erased candidate apart.
 */
export function adaptApplicant(
  application: ApiApplicationRow,
): ApplicationApplicant | null {
  const applicant = application.applicant;

  if (!applicant) {
    return null;
  }

  if (applicant.anonymized) {
    return {
      displayName: ANONYMIZED_APPLICANT_NAME,
      specialty: applicant.specialty,
      profileType: applicant.profileType,
      verified: false,
      anonymized: true,
    };
  }

  return {
    displayName: applicant.user.name?.trim() || "Candidat",
    city: applicant.city?.trim() || undefined,
    specialty: applicant.specialty,
    profileType: applicant.profileType,
    verified: applicant.verified,
    anonymized: false,
    image: applicant.user.image ?? undefined,
  };
}

export function adaptReceivedApplication(
  application: ApiApplicationRow,
): ReceivedApplication | null {
  const applicant = adaptApplicant(application);

  // The backend always embeds the applicant on this endpoint; bail rather than
  // render a card with no identity to attribute it to.
  if (!applicant) {
    return null;
  }

  return {
    id: application.id,
    status: application.status,
    decisionSource: application.decisionSource ?? null,
    submittedLabel: `Candidature ${formatRelativeTime(application.createdAt)}`,
    message: application.message?.trim() || undefined,
    rejectionReason: application.rejectionReason?.trim() || undefined,
    withdrawnReason: application.withdrawnReason?.trim() || undefined,
    viewed: Boolean(application.viewedAt),
    viewedAt: application.viewedAt ?? undefined,
    applicant,
    raw: application,
  };
}

/** Sums the server's unfiltered per-status totals a bucket covers. */
export function countForFilter(
  option: { statuses: ReplacementListingStatus[] },
  counts: Record<ReplacementListingStatus | "total", number>,
): number {
  if (option.statuses.length === 0) {
    return counts.total;
  }
  return option.statuses.reduce(
    (sum, status) => sum + (counts[status] ?? 0),
    0,
  );
}

/**
 * How many of the listings *on hand* are still recruiting. For the whole
 * collection, use `recruitingCount` over the server's totals.
 */
export function countRecruitingListings(
  listings: ReadonlyArray<{ status: ReplacementListingStatus }>,
): number {
  return listings.filter((listing) => RECRUITING_STATUSES.has(listing.status))
    .length;
}

/** How many listings are still recruiting, from the server's totals. */
export function recruitingCount(counts: ListingStatusCounts): number {
  let total = 0;
  for (const status of RECRUITING_STATUSES) {
    total += counts[status];
  }
  return total;
}

/** The status buckets of a filter pill, each with its count. */
export function listingFilterBuckets(
  counts: ListingStatusCounts,
): Array<{ id: ListingsFilter; label: string; count: number }> {
  return LISTING_FILTERS.map((option) => ({
    id: option.id,
    label: option.label,
    count: countForFilter(option, counts),
  }));
}

/** « 3 candidatures actives » — the count that decides whether to act. */
export function formatActiveApplications(count: number): string {
  if (count === 0) {
    return "Aucune candidature active";
  }
  return `${count} candidature${plural(count)} active${plural(count)}`;
}

/** « 2 candidats sur 5 » — capacity, only when the listing declares a cap. */
export function formatCapacity(
  count: number,
  maxApplications?: number,
): string | undefined {
  if (!maxApplications) {
    return undefined;
  }
  return `${count} candidat${plural(count)} sur ${maxApplications}`;
}

/** « Dentiste » — the specialty a candidate practised, kept after erasure. */
export function specialtyLabel(specialty: keyof typeof SPECIALTY_LABELS) {
  return SPECIALTY_LABELS[specialty];
}

export function countForReceivedFilter(
  option: ReceivedApplicationsFilterOption,
  counts: ReceivedApplicationCounts,
): number {
  if (!option.status) {
    return counts.total;
  }
  return counts[option.status] ?? 0;
}

/**
 * « Publiée il y a 3 semaines », or « Créée » for a draft, which has never been
 * published.
 */
export function formatListingAge(listing: {
  status: ReplacementListingStatus;
  createdAt: string;
}): string {
  const verb = listing.status === "DRAFT" ? "Créée" : "Publiée";
  return `${verb} ${formatRelativeTime(listing.createdAt)}`;
}

/**
 * Why the practice ruled the way it did; undefined while nobody has, since the
 * status badge already says so.
 */
export function receivedDecisionLabel(
  application: Pick<ReceivedApplication, "decisionSource">,
): string | undefined {
  return application.decisionSource
    ? RECEIVED_DECISION_LABELS[application.decisionSource]
    : undefined;
}

/** How many specialty rows the browse rail shows before folding the rest. */
export const SPECIALTY_RAIL_ROWS = 5;

export interface SpecialtyRailRow {
  specialty: keyof typeof SPECIALTY_LABELS;
  label: string;
  shortLabel: string;
  count: number;
  percent: number;
  active: boolean;
}

export interface FacetsRail {
  urgentPercent: number;
  open: number;
  rows: SpecialtyRailRow[];
  foldedCount: number;
  foldedSpecialties: number;
}

/**
 * What the browse rail draws: the figures, and the specialty rows it keeps —
 * the active one is always shown, even outside the top five.
 */
export function adaptFacetsRail(
  facets: {
    total: number;
    urgent: number;
    bySpecialty: ReadonlyArray<{
      specialty: keyof typeof SPECIALTY_LABELS;
      label: string;
      count: number;
      percent: number;
    }>;
  },
  activeSpecialty: string,
): FacetsRail {
  const topRows = facets.bySpecialty.slice(0, SPECIALTY_RAIL_ROWS);
  const active = activeSpecialty
    ? facets.bySpecialty.find((row) => row.specialty === activeSpecialty)
    : undefined;
  const shown =
    active && !topRows.includes(active) ? [...topRows, active] : topRows;
  const folded = facets.bySpecialty.filter((row) => !shown.includes(row));

  return {
    urgentPercent: percentOf(facets.urgent, facets.total),
    open: Math.max(0, facets.total - facets.urgent),
    rows: shown.map((row) => ({
      specialty: row.specialty,
      label: row.label,
      shortLabel: SPECIALTY_SHORT_LABELS[row.specialty],
      count: row.count,
      percent: row.percent,
      active: activeSpecialty === row.specialty,
    })),
    foldedCount: folded.reduce((sum, row) => sum + row.count, 0),
    foldedSpecialties: folded.length,
  };
}

/** One status in a distribution of the member's listings. */
export interface ListingStatusRow {
  status: keyof typeof LISTING_STATUS_META;
  label: string;
  shortLabel: string;
  count: number;
  percent: number;
}

/**
 * The member's listings by status, over the whole collection: only the
 * statuses that hold any, in the order a listing moves through them.
 */
export function listingStatusRows(
  counts: ListingStatusCounts,
): ListingStatusRow[] {
  return LISTING_STATUS_ORDER.filter((status) => (counts[status] ?? 0) > 0).map(
    (status) => ({
      status,
      label: LISTING_STATUS_META[status].label,
      shortLabel: LISTING_STATUS_META[status].shortLabel,
      count: counts[status] ?? 0,
      percent: percentOf(counts[status] ?? 0, counts.total),
    }),
  );
}

export interface MyListingsRailData {
  recruiting: number;
  recruitingPercent: number;
  activeCandidates: number;
  urgent: number;
  filled: number;
  filledPercent: number;
  recruitingTotal: number;
  statusRows: ListingStatusRow[];
  specialtyBars: Array<{
    key: keyof typeof SPECIALTY_LABELS;
    label: string;
    short: string;
    count: number;
  }>;
}

const MAX_SPECIALTY_BARS = 6;

/** The practice rail's aggregates: whole-collection totals plus the page's own. */
export function adaptMyListingsRail(
  listings: readonly MyListing[],
  counts: ListingStatusCounts,
): MyListingsRailData {
  const recruiting = countRecruitingListings(listings);
  // Active candidates only: a refused one no longer holds a slot.
  const activeCandidates = listings.reduce(
    (sum, listing) => sum + listing.applicationsCount,
    0,
  );
  const urgent = listings.filter((listing) => listing.urgent).length;

  const perSpecialty = new Map<keyof typeof SPECIALTY_LABELS, number>();
  for (const listing of listings) {
    perSpecialty.set(
      listing.specialty,
      (perSpecialty.get(listing.specialty) ?? 0) + 1,
    );
  }

  return {
    recruiting,
    recruitingPercent: percentOf(recruiting, listings.length),
    activeCandidates,
    urgent,
    filled: counts.FILLED,
    filledPercent: percentOf(counts.FILLED, counts.total),
    recruitingTotal: recruitingCount(counts),
    statusRows: listingStatusRows(counts),
    specialtyBars: [...perSpecialty.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SPECIALTY_BARS)
      .map(([specialty, count]) => ({
        key: specialty,
        label: SPECIALTY_LABELS[specialty],
        short: SPECIALTY_SHORT_LABELS[specialty],
        count,
      })),
  };
}

/** One application status in a listing's distribution of candidates. */
export interface ReceivedStatusRow {
  status: ApplicationStatus;
  label: string;
  count: number;
  percent: number;
}

export interface ListingDetailRail {
  /** The arc: the cap's fill when there is a cap, else the share decided. */
  gauge: { percent: number; caption: string };
  received: number;
  pending: number;
  shortlisted: number;
  accepted: number;
  /** Statuses that hold any candidate, in the order a candidate moves. */
  rows: ReceivedStatusRow[];
}

const RECEIVED_ORDER: readonly ApplicationStatus[] = [
  "PENDING",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
];

/**
 * The summary down the left of a listing's page, from the server's totals
 * (never the page of candidates on screen).
 */
export function adaptListingDetailRail(
  listing: Pick<MyListing, "applicationsCount" | "maxApplications">,
  counts: ListingApplicationsData["counts"],
): ListingDetailRail {
  const decided = counts.ACCEPTED + counts.REJECTED;
  const answerable = counts.total - counts.WITHDRAWN;

  const gauge = listing.maxApplications
    ? {
        percent: percentOf(
          listing.applicationsCount,
          listing.maxApplications,
          true,
        ),
        caption: `${listing.applicationsCount} candidat${plural(listing.applicationsCount)} actif${plural(listing.applicationsCount)} sur ${listing.maxApplications} places`,
      }
    : {
        percent: percentOf(decided, answerable),
        caption: `${decided} candidature${plural(decided)} traitée${plural(decided)} sur ${answerable}`,
      };

  return {
    gauge,
    received: counts.total,
    pending: counts.PENDING,
    shortlisted: counts.SHORTLISTED,
    accepted: counts.ACCEPTED,
    rows: RECEIVED_ORDER.filter((status) => counts[status] > 0).map(
      (status) => ({
        status,
        label: RECEIVED_STATUS_LABELS[status],
        count: counts[status],
        percent: percentOf(counts[status], counts.total),
      }),
    ),
  };
}
