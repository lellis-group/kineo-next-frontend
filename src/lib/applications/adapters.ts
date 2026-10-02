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
  ANOTHER_CANDIDATE_SELECTED: {
    headline: "Un autre candidat a été retenu",
    summary:
      "Le cabinet a retenu un autre candidat pour cette annonce. Votre profil n'a pas été jugé insuffisant : la place était pourvue.",
  },
  LISTING_CLOSED: {
    headline: "Annonce clôturée",
    summary:
      "Le cabinet a clôturé son annonce. Aucun remplacement n'a été retenu sur celle-ci.",
  },
  LISTING_CLOSED_NO_CANDIDATE: {
    headline: "Annonce clôturée sans remplaçant",
    summary:
      "Le cabinet a clôturé son annonce sans retenir de remplaçant. Cela ne dit rien de votre candidature.",
  },
  LISTING_CANCELLED: {
    headline: "Annonce annulée",
    summary:
      "Le cabinet a abandonné le remplacement qu'il avait publié. Cela ne dit rien de votre candidature.",
  },
  LISTING_ERASED: {
    headline: "Cabinet fermé son compte",
    summary:
      "Le cabinet a fermé son compte et l'annonce n'existe plus. Votre candidature reste enregistrée ici.",
  },
  CANDIDATE_UNAVAILABLE: {
    headline: "Candidat indisponible",
    summary: "Le cabinet a annoncé que ce candidat n'était plus disponible.",
  },
};

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
 * Sums `decisionCounts` over the keys the bucket names, because the buckets cut
 * across statuses: « Un autre candidat retenu » and « Refusées par le cabinet »
 * are both `REJECTED`, and a status-based counter would show the same number on
 * both chips. The totals come from the server over the whole collection, so
 * they hold still while paging.
 */
export function countForBucket(
  option: ApplicationsFilterOption,
  data: ApplicationsData,
): number {
  if (option.id === "ALL") {
    return data.counts.total;
  }

  if (!option.countKeys) {
    // No keys declared: the bucket is exactly one status.
    return data.counts[option.id as keyof typeof data.counts] ?? 0;
  }

  // `countKeys` are decision-source names, but typed loosely so a bucket can
  // name any of them. A key the server does not send reads 0 rather than NaN —
  // the difference between « nobody in this case » and a broken counter.
  //
  // The whole map may be absent: a payload serialised before `decisionCounts`
  // existed has no such key, and indexing it unguarded threw on a page that was
  // otherwise fine. An older backend behaves the same way during a rolling
  // deploy. Empty counters are the honest degradation — the list is still
  // correct, only the numbers are missing.
  const sources = data.decisionCounts;
  if (!sources) {
    return 0;
  }

  return option.countKeys.reduce<number>(
    (sum, key) => sum + (sources[key] ?? 0),
    0,
  );
}

/** Applications tracking page — situation filters, list and pagination. */
