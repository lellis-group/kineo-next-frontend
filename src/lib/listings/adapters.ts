/**
 * Adapters — turn raw API payloads into the presentation contracts of
 * `./contracts`.
 */

import { formatRelativeTime, plural } from "../format";
import { SPECIALTY_LABELS } from "../profile";
import type {
  ApiApplicationRow,
  ApiReplacementListing,
  ApplicationDecisionSource,
  ApplicationStatus,
  ReplacementListingStatus,
} from "../types/api";
import type {
  ApplicationApplicant,
  ListingStatusCounts,
  MyListing,
  ReceivedApplication,
  ReceivedApplicationCounts,
  ReceivedApplicationsFilterOption,
} from "./contracts";
import { RECRUITING_STATUSES } from "./contracts";
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
