/**
 * Adapters — turn raw API payloads into the presentation contracts of
 * `./contracts`, including French status labels and badge tones.
 */

import { formatDateRange, formatRelativeTime } from "../format";
import type {
  ApiApplication,
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

/**
 * What the applicant is told, per decision.
 *
 * The status is too coarse to carry this. `REJECTED` covers four situations
 * that read nothing alike to the person who applied, and only one of them is
 * about them: being passed over for someone else is not a refusal, and an
 * applicant reading « Candidature rejetée » over a posting that closed with
 * nobody chosen concludes the practice judged them.
 *
 * The practice's own words stay attached on top of this, when it wrote any —
 * `PRACTICE_REJECTED` is the only one that can carry free text, and a missing
 * reason there falls back to saying so rather than inventing a motive.
 */
/** What the two decision helpers read: the row's status and who settled it. */
export interface ApplicationStatusHint {
  status: ApplicationStatus;
  decisionSource: ApplicationDecisionSource | null;
  rejectionReason?: string;
}

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
 *
 * Same two statuses as `WITHDRAWABLE_STATUSES`, reached from the other side:
 * that set is what the backend will still accept a withdrawal for, this one is
 * what the dashboard counts as unresolved. They match because a practice can
 * only decide after the candidate has applied, and everything from `ACCEPTED`
 * onwards is a decision already taken.
 *
 * `SHORTLISTED` belongs here: being put forward is the practice responding, but
 * it has not yet chosen anyone, so the candidate is still waiting. Counting only
 * `PENDING` reported zero applications outstanding for anyone who had been
 * shortlisted, which read as "nothing to wait for".
 */
export const AWAITING_DECISION_STATUSES: ReadonlySet<ApplicationStatus> =
  new Set(["PENDING", "SHORTLISTED"]);

/** How many applications are still awaiting the practice's decision. */
export function countAwaitingDecision(
  applications: ReadonlyArray<{ status: ApplicationStatus }>,
): number {
  return applications.filter((application) =>
    AWAITING_DECISION_STATUSES.has(application.status),
  ).length;
}

/** Label shown when the targeted listing no longer resolves. */
export const LISTING_FALLBACK_TITLE = "Titre d'annonce indisponible";

/**
 * "Practice · City", or whichever of the two is known.
 *
 * The card and the detail header both built this by hand, which is how they came
 * to disagree about a missing name: the card fell back to when the application
 * was sent, the header rendered nothing at all. The fallback belongs to each
 * screen — it is a layout choice, not a fact about the listing — so this only
 * answers the label.
 */
/**
 * Newest first, on `createdAt`.
 *
 * Two screens sorted this identically — same expression, same direction — and
 * nothing said so; the dashboard's copy even noted the copy it had to make
 * before sorting. Both now ask here, so a change of "most recent" cannot leave
 * one screen behind.
 */
export function byNewestFirst<T extends { createdAt: string }>(
  a: T,
  b: T,
): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

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
 * marker, not a name, so it must never reach the screen: joined with the city
 * it rendered as « — · — », and on a ghost listing as
 * « Annonce retirée par son auteur · — ».
 */
const ANONYMIZED_FIELD = "—";

/** A redacted value is displayed as no value at all. */
function visibleField(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return !trimmed || trimmed === ANONYMIZED_FIELD ? undefined : trimmed;
}

/**
 * Resolves an application's listing from the data embedded server-side — no
 * extra fetches, works for listings hidden to the user.
 */
function adaptListingInfo(application: ApiApplication): ApplicationListingInfo {
  const embedded = application.listing;

  if (!embedded) {
    // Legacy response without the embedded listing — nothing else to show.
    return { id: application.listingId, title: LISTING_FALLBACK_TITLE };
  }

  // A period of a single day is not a period. `create` rejects
  // `startDate >= endDate`, so equal dates cannot come from a real listing: the
  // only rows carrying them are the ghost listings the backend creates when an
  // account is erased, which deliberately have no window. Rendering those gave
  // « Du 6 au 6 oct. » — a fabricated schedule for a posting that no longer
  // exists. Omitting the range lets the card drop the line and the detail fall
  // back to « Dates non communiquées ».
  const isSingleDay = embedded.startDate === embedded.endDate;

  return {
    id: embedded.id,
    title: embedded.title,
    dateRange: isSingleDay
      ? undefined
      : formatDateRange(embedded.startDate, embedded.endDate),
    description: embedded.description?.trim() || undefined,
    practiceName: visibleField(embedded.practice.name),
    practiceCity: visibleField(embedded.practice.city),
  };
}

export function adaptApplicationEntry(
  application: ApiApplication,
): ApplicationEntry {
  const message = application.message?.trim();

  return {
    id: application.id,
    status: application.status,
    // Rows written before the column existed arrive without it. Falling back to
    // null keeps the banner on its status-only wording rather than claiming a
    // decision nobody recorded.
    decisionSource: application.decisionSource ?? null,
    createdAt: application.createdAt,
    submittedLabel: `Postulé ${formatRelativeTime(application.createdAt)}`,
    viewed: Boolean(application.viewedAt),
    message: message || undefined,
    rejectionReason: application.rejectionReason?.trim() || undefined,
    rejectionBucket: application.rejectionBucket ?? null,
    withdrawnReason: application.withdrawnReason?.trim() || undefined,
    viewedAt: application.viewedAt,
    respondedAt: application.respondedAt,
    listing: adaptListingInfo(application),
  };
}

/**
 * Counter for one bucket.
 *
 * Lives here beside `countForFilter` and `countForReceivedFilter` on the listings
 * side, which answer the same question for the other two screens. It was the
 * only one of the three living in a component.
 *
 * Every status bucket is exactly one status, so the status totals answer it. The
 * situations are the opposite: they are all one status, which is why they need the
 * backend's own totals.
 */
/**
 * Counter for one situation.
 *
 * Never summed from `applications`: the list is one page of a filtered query, so a
 * count read off it would describe the page rather than what exists — and the
 * situation row stays on screen while a situation is selected, where that would
 * make every remaining chip read 1.
 */
export function countForSituation(
  situation: RejectionSituationFilter,
  data: ApplicationsData,
): number {
  if (situation === "ALL") {
    // The rejected total, not the sum of the three: an erasure settles a rejection
    // too, and it is in this count and in none of the others. Summing the parts
    // here would make « Toutes » disagree with « Refusées » directly above it, by
    // exactly the number that was settled rather than decided.
    return data.counts.REJECTED ?? 0;
  }
  return data.bucketCounts[situation] ?? 0;
}

/**
 * Counter for one status chip.
 *
 * Lives here beside `countForSituation` and the listings-side counters, which
 * answer the same question for the other two screens.
 */
export function countForBucket(
  option: ApplicationsFilterOption,
  data: ApplicationsData,
): number {
  return option.id === "ALL"
    ? data.counts.total
    : (data.counts[option.id as keyof typeof data.counts] ?? 0);
}
