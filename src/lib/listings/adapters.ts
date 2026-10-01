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
  ApplicationDecisionSource,
  ApplicationStatus,
  ReplacementListingStatus,
} from "../types/api";
import type {
  ApplicationApplicant,
  ListingStatusMeta,
  MyListing,
  ReceivedApplication,
  ReceivedApplicationCounts,
  ReceivedApplicationsFilterOption,
} from "./contracts";
import { RECRUITING_STATUSES } from "./contracts";

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
  CLOSED_NO_CANDIDATE: {
    label: "Clôturée sans remplaçant",
    tone: "neutral",
  },
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

/**
 * Why the practice ruled the way it did, in its own vocabulary.
 *
 * The mirror of `DECISION_SUMMARIES` on the applicant side, and for the same
 * reason: `REJECTED` covers four histories, and only one of them is a judgement
 * of the candidate. A practice reading its own list used to see « Refusé » on a
 * row it never refused — the posting was cancelled, or it closed with nobody
 * kept, or the candidate withdrew — which reads as a decision it took and did
 * not. The label is per row, from that row's own `decisionSource`, so it costs
 * no extra aggregate to be exact.
 *
 * From the practice's point of view the candidate withdrew, so this file says
 * « a retiré sa candidature » where the applicant screen says « vous avez retiré
 * votre candidature ».
 */
export const RECEIVED_DECISION_LABELS: Record<
  ApplicationDecisionSource,
  string
> = {
  CANDIDATE_WITHDREW: "Candidature retirée par le candidat",
  PRACTICE_ACCEPTED: "Acceptée par le cabinet",
  PRACTICE_REJECTED: "Refusée par le cabinet",
  ANOTHER_CANDIDATE_SELECTED: "Un autre candidat a été retenu",
  LISTING_CLOSED: "Annonce clôturée",
  LISTING_CLOSED_NO_CANDIDATE: "Annonce clôturée sans remplaçant",
  LISTING_CANCELLED: "Annonce annulée",
  LISTING_ERASED: "Cabinet fermé son compte",
  CANDIDATE_UNAVAILABLE: "Candidat déclaré indisponible",
};

export function adaptMyListings(
  listings: ApiReplacementListing[],
): MyListing[] {
  return listings.map(adaptMyListing);
}

export function adaptMyListing(listing: ApiReplacementListing): MyListing {
  return {
    id: listing.id,
    title: listing.title,
    status: listing.status,
    specialty: listing.specialty,
    dateRange: formatDateRange(listing.startDate, listing.endDate),
    startDate: listing.startDate,
    endDate: listing.endDate,
    description: listing.description?.trim() || undefined,
    urgent: listing.urgent,
    applicationsCount: listing.applicationsCount ?? 0,
    maxApplications: listing.maxApplications ?? undefined,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
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
    // Null on every open application, whichever side of the shortlist it is on:
    // a candidate nobody has ruled on has no decision to report.
    decisionSource: application.decisionSource ?? null,
    submittedLabel: `Candidature ${formatRelativeTime(application.createdAt)}`,
    message: application.message?.trim() || undefined,
    rejectionReason: application.rejectionReason?.trim() || undefined,
    withdrawnReason: application.withdrawnReason?.trim() || undefined,
    viewed: Boolean(application.viewedAt),
    viewedAt: application.viewedAt,
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

/**
 * How many listings are still recruiting.
 *
 * Sourced from `RECRUITING_STATUSES` rather than spelled out, because the
 * concept already has a name and two other surfaces use it: the « En cours »
 * filter bucket on /listings/mine, and the gate that decides whether a listing
 * card offers close/cancel. The dashboard used to re-derive the count with
 * `OPEN` + `IN_DISCUSSION` written out by hand, in two places, which left a
 * FULL listing counted as "En cours" on one screen and absent from the homepage
 * headline on the next.
 *
 * Takes raw payloads because the dashboard counts before adapting; a caller that
 * already holds `MyListing` can filter with the same set directly.
 */
export function countRecruitingListings(
  listings: ReadonlyArray<{ status: ReplacementListingStatus }>,
): number {
  return listings.filter((listing) => RECRUITING_STATUSES.has(listing.status))
    .length;
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

/**
 * Counter for a bucket of received candidates.
 *
 * One status per bucket, so this is a single lookup — `?? 0` because a status the
 * backend did not report must read as « nobody in this case », never as NaN.
 */
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
 * « Publiée il y a 3 semaines », « Créée il y a 2 jours ».
 *
 * The verb follows the status rather than the clock: a draft has never been
 * published, and saying « Publiée » about one is a small lie the reader notices
 * on the page where they decide to publish it. A terminal posting was published
 * too, so the past participle stays — what changed is not when it appeared.
 */
export function formatListingAge(listing: {
  status: ReplacementListingStatus;
  createdAt: string;
}): string {
  const verb = listing.status === "DRAFT" ? "Créée" : "Publiée";
  return `${verb} ${formatRelativeTime(listing.createdAt)}`;
}

/**
 * Why the practice ruled the way it did, when it has.
 *
 * Only a decided application has one. The open statuses used to fall back to
 * « À traiter », printed right under the badge that already reads « En attente »
 * or « Présélectionné » — the same fact twice, in two sizes, on the row a
 * practice scans the fastest. There is nothing to add while nobody has ruled:
 * the badge is the whole of it.
 *
 * Prefers the decision source over the status, for the reason
 * `RECEIVED_DECISION_LABELS` gives: `REJECTED` alone reads as a refusal the
 * practice chose, and most of the time it is something that happened to the
 * posting.
 */
export function receivedDecisionLabel(
  application: Pick<ReceivedApplication, "decisionSource">,
): string | undefined {
  return application.decisionSource
    ? RECEIVED_DECISION_LABELS[application.decisionSource]
    : undefined;
}
