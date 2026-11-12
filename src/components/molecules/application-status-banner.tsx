import {
  type ApplicationEntry,
  decisionHeadline,
  decisionSummary,
  STATUS_HEADLINES,
  STATUS_META,
} from "@/lib/applications";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { BadgeTone } from "@/lib/ui-tokens";

/** Band classes per badge tone. */
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
 * What happened, once something did. The decision source comes first: it
 * separates "refused" from "closed with nobody chosen". The practice's own
 * words are appended only when it decided itself.
 */
function buildDecidedSummary(application: ApplicationEntry): string {
  return decisionSummary(application);
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

  // The status covers rows written before `decisionSource` existed.
  const headline = decisionHeadline(
    application,
    (status) => STATUS_HEADLINES[status],
  );

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
      <p className="text-sm font-medium">{headline}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{summary}</p>
    </div>
  );
}
