/**
 * Adapters — turn raw API payloads into the presentation contracts of
 * `./contracts`, including French status labels and badge tones.
 */

import { formatDateRange, formatRelativeTime } from "../format";
import type {
  ApiApplicationRow,
  ApiApplicationStatusCounts,
  ApplicationDecisionSource,
  ApplicationStatus,
} from "../types/api";
import type { BadgeTone } from "../ui-tokens";
import type {
  ApplicationEntry,
  ApplicationListingInfo,
  ApplicationsData,
  ApplicationsFilterOption,
  RejectionSituationFilter,
} from "./contracts";

export interface ApplicationStatusMeta {
  label: string;
  badgeTone: BadgeTone;
}

/** French labels + badge tone per API status. */
export const STATUS_META: Record<ApplicationStatus, ApplicationStatusMeta> = {
  PENDING: { label: "En attente", badgeTone: "warning" },
  SHORTLISTED: { label: "Présélectionnée", badgeTone: "info" },
  ACCEPTED: { label: "Acceptée", badgeTone: "success" },
  REJECTED: { label: "Rejetée", badgeTone: "danger" },
  WITHDRAWN: { label: "Retirée", badgeTone: "neutral" },
};

/** What the two decision helpers read: the row's status and who settled it. */
export interface ApplicationStatusHint {
  status: ApplicationStatus;
  decisionSource: ApplicationDecisionSource | null;
  rejectionReason?: string;
}

/**
 * What the applicant is told, per decision.
 *
 * The status is too coarse to carry this: `REJECTED` covers situations that
 * read nothing alike to the person who applied, and being passed over for
 * someone else is not a refusal.
 */
export const DECISION_SUMMARIES: Record<
  ApplicationDecisionSource,
  { headline: string; summary: string }
> = {
  CANDIDATE_WITHDREW: {
    headline: "Candidature retirée",
    summary: "Vous avez retiré votre candidature.",
  },
  PRACTICE_ACCEPTED: {
    headline: "Candidature acceptée",
    summary: "Le cabinet a accepté votre candidature.",
  },
  PRACTICE_REJECTED: {
    headline: "Candidature refusée",
    summary: "Le cabinet a refusé votre candidature.",
  },
  SYSTEM: {
    headline: "Compte fermé",
    summary:
      "Un compte lié à cette candidature a été fermé. Cela ne dit rien de votre candidature.",
  },
};

/**
 * The one `SYSTEM` outcome, told apart by the status it arrives with.
 *
 * The erasure path writes `SYSTEM` whether the account that went was the
 * candidate's or the practice's — deliberately, since what survives an erasure is
 * the fact that someone decided rather than who — and the two are not the same
 * news for the reader. A `WITHDRAWN` one is the candidate's own erasure; a
 * `REJECTED` one is a practice that no longer exists.
 */
export function decisionHeadline(
  entry: ApplicationStatusHint,
  fallback: (status: ApplicationStatus) => string,
): string {
  if (entry.decisionSource === "SYSTEM") {
    return entry.status === "WITHDRAWN"
      ? "Vous avez fermé votre compte"
      : "Cabinet fermé son compte";
  }
  return entry.decisionSource
    ? DECISION_SUMMARIES[entry.decisionSource].headline
    : fallback(entry.status);
}

/** The summary half of the same two questions. */
export function decisionSummary(entry: ApplicationStatusHint): string {
  if (entry.decisionSource === "SYSTEM") {
    return entry.status === "WITHDRAWN"
      ? "Vous avez fermé votre compte : cette candidature a été retirée."
      : "Le cabinet a fermé son compte et l'annonce n'existe plus. Votre candidature reste enregistrée ici.";
  }
  if (!entry.decisionSource) {
    return entry.status === "ACCEPTED"
      ? "Le cabinet a accepté votre candidature."
      : "Aucun motif n'a été communiqué par le cabinet.";
  }

  const base = DECISION_SUMMARIES[entry.decisionSource].summary;
  const decidedByPractice =
    entry.decisionSource === "PRACTICE_REJECTED" ||
    entry.decisionSource === "PRACTICE_ACCEPTED";

  if (decidedByPractice && entry.rejectionReason) {
    return `${base} Son motif : « ${entry.rejectionReason} »`;
  }

  return base;
}

/**
 * Headline for the outcome banner. A second, more explicit register than
 * `STATUS_META.label`: that one is the chip's short form (« En attente »), this
 * one names the situation (« En attente de réponse »). Both belong here so the
 * two vocabularies for a status are edited side by side.
 */
export const STATUS_HEADLINES: Record<ApplicationStatus, string> = {
  PENDING: "En attente de réponse",
  SHORTLISTED: "Présélectionnée",
  ACCEPTED: "Candidature acceptée",
  REJECTED: "Candidature rejetée",
  WITHDRAWN: "Candidature retirée",
};

/** Statuses open to withdrawal — the backend 400s on decided/withdrawn ones. */
export const WITHDRAWABLE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "PENDING",
  "SHORTLISTED",
]);

/**
 * Statuses where the candidate is still waiting on the practice's answer.
 * `SHORTLISTED` counts: the practice has not chosen anyone yet.
 */
export const AWAITING_DECISION_STATUSES: ReadonlySet<ApplicationStatus> =
  new Set(["PENDING", "SHORTLISTED"]);

/**
 * Sums the server's totals rather than counting rows: a caller holding one page
 * would report a page.
 */
export function awaitingDecisionCount(
  counts: ApiApplicationStatusCounts,
): number {
  let total = 0;
  for (const status of AWAITING_DECISION_STATUSES) {
    total += counts[status];
  }
  return total;
}

/** Label shown when the targeted listing no longer resolves. */
export const LISTING_FALLBACK_TITLE = "Titre d'annonce indisponible";

/** Newest first, on `createdAt`. */
export function byNewestFirst<T extends { createdAt: string }>(
  a: T,
  b: T,
): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/** "Practice · City", or whichever of the two is known. */
export function practiceLabel(listing: {
  practiceName?: string;
  practiceCity?: string;
}): string {
  return listing.practiceName
    ? `${listing.practiceName}${listing.practiceCity ? ` · ${listing.practiceCity}` : ""}`
    : (listing.practiceCity ?? "");
}

/**
 * Placeholder the backend writes over erased practice fields. It is a redaction
 * marker, not a name, so it must never reach the screen.
 */
const ANONYMIZED_FIELD = "—";

function visibleField(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return !trimmed || trimmed === ANONYMIZED_FIELD ? undefined : trimmed;
}

/**
 * Resolves an application's listing from the data embedded server-side — no
 * extra fetches, works for listings hidden to the user.
 */
function adaptListingInfo(
  application: ApiApplicationRow,
): ApplicationListingInfo {
  const embedded = application.listing;

  if (!embedded) {
    // Legacy response without the embedded listing — nothing else to show.
    return { id: application.listingId, title: LISTING_FALLBACK_TITLE };
  }

  // `create` rejects `startDate >= endDate`, so equal dates only come from the
  // ghost listings the backend creates when an account is erased, which have no
  // real window. Omitting the range lets the card drop the line and the detail
  // fall back to « Dates non communiquées ».
  const isSingleDay = embedded.startDate === embedded.endDate;

  return {
    id: embedded.id,
    title: embedded.title,
    dateRange: isSingleDay
      ? undefined
      : formatDateRange(embedded.startDate, embedded.endDate),
    // On the single read only: a list row's listing carries no paragraph.
    description:
      "description" in embedded && typeof embedded.description === "string"
        ? embedded.description.trim() || undefined
        : undefined,
    practiceName: visibleField(embedded.practice.name),
    practiceCity: visibleField(embedded.practice.city),
  };
}

export function adaptApplicationEntry(
  application: ApiApplicationRow,
): ApplicationEntry {
  const message = application.message?.trim();

  return {
    id: application.id,
    status: application.status,
    // Rows written before the column existed arrive without it.
    decisionSource: application.decisionSource ?? null,
    createdAt: application.createdAt,
    submittedLabel: `Postulé ${formatRelativeTime(application.createdAt)}`,
    viewed: Boolean(application.viewedAt),
    message: message || undefined,
    rejectionReason: application.rejectionReason?.trim() || undefined,
    rejectionBucket: application.rejectionBucket ?? null,
    withdrawnReason: application.withdrawnReason?.trim() || undefined,
    viewedAt: application.viewedAt ?? undefined,
    respondedAt: application.respondedAt ?? undefined,
    listing: adaptListingInfo(application),
  };
}

/**
 * Never summed from `applications`: the list is one page of a filtered query, so
 * a count read off it would describe the page rather than what exists.
 */
export function countForSituation(
  situation: RejectionSituationFilter,
  data: ApplicationsData,
): number {
  if (situation === "ALL") {
    // The rejected total, not the sum of the three: an erasure settles a
    // rejection too, and it is in this count and in none of the others.
    return data.counts.REJECTED ?? 0;
  }
  return data.bucketCounts[situation] ?? 0;
}

export function countForBucket(
  option: ApplicationsFilterOption,
  data: ApplicationsData,
): number {
  if (option.id === "ALL") {
    return data.counts.total;
  }
  // The server's totals are keyed by the status ("REJECTED"), not by the
  // presentation id ("REFUSED").
  const status = option.status;
  if (status === undefined) return 0;
  return data.counts[status] ?? 0;
}
