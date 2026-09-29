/**
 * Adapters — turn raw API payloads into the presentation contracts of
 * `./contracts`, including French status labels and badge tones.
 */

import type { BadgeTone } from "@/components/atoms/badge";
import { formatDateRange, formatRelativeTime } from "../format";
import type { ApiApplication, ApplicationStatus } from "../types/api";
import type { ApplicationEntry, ApplicationListingInfo } from "./contracts";

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

/** Statuses open to withdrawal — the backend 400s on decided/withdrawn ones. */
export const WITHDRAWABLE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "PENDING",
  "SHORTLISTED",
]);

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
export function adaptListingInfo(
  application: ApiApplication,
): ApplicationListingInfo {
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
