import type { BadgeTone } from "@/components/atoms/badge";
import { type ApplicationEntry, STATUS_META } from "@/lib/applications";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types/api";

/** Status headline — more explicit than the chip label. */
const STATUS_HEADLINES: Record<ApplicationStatus, string> = {
  PENDING: "En attente de réponse",
  SHORTLISTED: "Présélectionnée",
  ACCEPTED: "Candidature acceptée",
  REJECTED: "Candidature rejetée",
  WITHDRAWN: "Candidature retirée",
};

/** Band classes per badge tone. */
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-2 text-foreground",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  info: "border-info/20 bg-info/10 text-info",
};

/** Summary line: key dates, or the decision reason once decided. */
function buildSummary(application: ApplicationEntry): string {
  const summaries: Record<ApplicationStatus, string> = {
    PENDING: application.viewedAt
      ? `Consultée par le cabinet le ${formatDateTime(application.viewedAt)}, réponse en attente.`
      : `Envoyée le ${formatDateTime(application.createdAt)}, pas encore consultée par le cabinet.`,
    SHORTLISTED: application.viewedAt
      ? `Consultée le ${formatDateTime(application.viewedAt)}, votre profil a été retenu par le cabinet.`
      : "Votre profil a été retenu par le cabinet.",
    ACCEPTED: application.respondedAt
      ? `Réponse du cabinet reçue le ${formatDateTime(application.respondedAt)}.`
      : "Le cabinet a accepté votre candidature.",
    REJECTED:
      application.rejectionReason ??
      "Aucun motif n'a été communiqué par le cabinet.",
    WITHDRAWN:
      application.withdrawnReason ?? "Aucun motif de retrait n'a été précisé.",
  };

  return summaries[application.status];
}

/** Tinted outcome banner: status headline + summary (key dates or reason). */
export function ApplicationStatusBanner({
  application,
  className,
}: {
  application: ApplicationEntry;
  className?: string;
}) {
  const meta = STATUS_META[application.status];

  return (
    <div
      className={cn(
        "rounded-control border p-4 sm:p-5",
        TONE_CLASSES[meta.badgeTone],
        className,
      )}
    >
      <p className="text-sm font-bold">
        {STATUS_HEADLINES[application.status]}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {buildSummary(application)}
      </p>
    </div>
  );
}
