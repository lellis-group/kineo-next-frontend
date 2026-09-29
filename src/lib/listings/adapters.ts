/**
 * Adapters — turn raw API payloads into the presentation contracts of
 * `./contracts`: French labels, formatted dates, and the display fallbacks an
 * anonymized candidate requires.
 */

import { formatDateRange, formatRelativeTime, plural } from "../format";
import { SPECIALTY_LABELS } from "../profile";
import type {
  ApiApplication,
  ApiReplacementListing,
  ApplicationStatus,
  ReplacementListingStatus,
} from "../types/api";
import type {
  ApplicationApplicant,
  ListingStatusMeta,
  MyListing,
  ReceivedApplication,
} from "./contracts";

/** Shown in place of a name once the account is erased. */
export const ANONYMIZED_APPLICANT_NAME = "Candidat anonymisé";

/** French labels + tone per listing status. */
export const LISTING_STATUS_META: Record<
  ReplacementListingStatus,
  ListingStatusMeta
> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  OPEN: { label: "Ouverte", tone: "info" },
  IN_DISCUSSION: { label: "Candidatures en cours", tone: "warning" },
  FULL: { label: "Complet", tone: "warning" },
  FILLED: { label: "Pourvue", tone: "success" },
  CLOSED: { label: "Clôturée", tone: "neutral" },
  CANCELLED: { label: "Annulée", tone: "danger" },
};

/** French labels per application status, as seen by the receiving practice. */
export const RECEIVED_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "En attente",
  SHORTLISTED: "Présélectionné",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  WITHDRAWN: "Retiré",
};

export function adaptMyListings(
  listings: ApiReplacementListing[],
): MyListing[] {
  return listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    status: listing.status,
    specialty: listing.specialty,
    dateRange: formatDateRange(listing.startDate, listing.endDate),
    description: listing.description?.trim() || undefined,
    urgent: listing.urgent,
    applicationsCount: listing.applicationsCount ?? 0,
    maxApplications: listing.maxApplications ?? undefined,
    createdAt: listing.createdAt,
  }));
}

/**
 * Resolves how a candidate should be named.
 *
 * The backend blanks `user.name` and `user.image` on erasure, so a missing
 * name alone is not evidence of anything. The `anonymized` flag is the only
 * trustworthy signal, and it drives both the label and whether the card tries
 * to show a location at all.
 */
export function adaptApplicant(
  application: ApiApplication,
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
  application: ApiApplication,
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
    submittedLabel: `Candidature ${formatRelativeTime(application.createdAt)}`,
    message: application.message?.trim() || undefined,
    rejectionReason: application.rejectionReason?.trim() || undefined,
    withdrawnReason: application.withdrawnReason?.trim() || undefined,
    applicant,
    raw: application,
  };
}

/**
 * Sums the per-status totals a bucket covers.
 *
 * Sourced from the server's unfiltered counts, so the chips keep showing the
 * size of every bucket while one of them is selected — the behaviour the
 * applications screen already relies on.
 */
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
