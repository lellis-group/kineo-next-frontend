import {
  type ApplicationEntry,
  DECISION_SUMMARIES,
  STATUS_HEADLINES,
  STATUS_META,
} from "@/lib/applications";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { BadgeTone } from "@/lib/ui-tokens";

/**
 * Band classes per badge tone.
 *
 * Same tones as the badge, painted as a wide band rather than a chip — the
 * vocabulary is shared (see `lib/ui-tokens.ts`), only the treatment differs.
 */
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-2 text-foreground",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  info: "border-info/20 bg-info/10 text-info",
};

function buildOpenSummary(application: ApplicationEntry): string {
  if (application.status === "SHORTLISTED") {
    return application.viewedAt
      ? `Consultée le ${formatDateTime(application.viewedAt)}, votre profil a été retenu par le cabinet.`
      : "Votre profil a été retenu par le cabinet.";
  }

  return application.viewedAt
    ? `Consultée par le cabinet le ${formatDateTime(application.viewedAt)}, réponse en attente.`
    : `Envoyée le ${formatDateTime(application.createdAt)}, pas encore consultée par le cabinet.`;
}

/**
 * What happened, once something did.
 *
 * The decision source comes first because it is the only thing separating "the
 * practice refused you" from "the practice closed the posting with nobody
 * chosen" — both a `REJECTED`, and the second says nothing about the applicant.
 *
 * A practice's own words are appended only when it decided itself: the other
 * outcomes are the platform's, so there is no free text to show, and inventing
 * one is what this whole column exists to stop.
 */
function buildDecidedSummary(application: ApplicationEntry): string {
  const source = application.decisionSource;

  if (!source) {
    // Rows written before the column existed, or a status that never sets one.
    if (application.status === "ACCEPTED") {
      return "Le cabinet a accepté votre candidature.";
    }
    return (
      application.rejectionReason ??
      "Aucun motif n'a été communiqué par le cabinet."
    );
  }

  const base = DECISION_SUMMARIES[source].summary;
  const decidedByPractice =
    source === "PRACTICE_REJECTED" || source === "PRACTICE_ACCEPTED";

  if (decidedByPractice && application.rejectionReason) {
    return `${base} Son motif : « ${application.rejectionReason} »`;
  }

  return base;
}

export function ApplicationStatusBanner({
  application,
  className,
}: {
  application: ApplicationEntry;
  className?: string;
}) {
  const stillOpen =
    application.status === "PENDING" || application.status === "SHORTLISTED";

  // The decision names the situation better than the status can; the status is
  // what covers rows written before `decisionSource` existed.
  const headline = application.decisionSource
    ? DECISION_SUMMARIES[application.decisionSource].headline
    : STATUS_HEADLINES[application.status];

  const summary = stillOpen
    ? buildOpenSummary(application)
    : buildDecidedSummary(application);

  const meta = STATUS_META[application.status];

  return (
    <div
      className={cn(
        "rounded-control border p-4 sm:p-5",
        TONE_CLASSES[meta.badgeTone],
        className,
      )}
    >
      <p className="text-sm font-bold">{headline}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{summary}</p>
    </div>
  );
}
