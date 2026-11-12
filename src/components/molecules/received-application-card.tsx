import { Avatar } from "@/components/atoms/avatar";
import { Badge } from "@/components/atoms/badge";
import { MapPinIcon } from "@/components/atoms/icons";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import { ReceivedApplicationActions } from "@/components/molecules/received-application-actions";
import { VerifiedBadge } from "@/components/molecules/verified-badge";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import {
  RECEIVED_STATUS_LABELS,
  type ReceivedApplication,
  receivedDecisionLabel,
  specialtyLabel,
} from "@/lib/listings";

/**
 * One candidate on a listing the user owns. After an erasure the backend
 * blanks name, city and avatar, so the card says why it is empty.
 */
export function ReceivedApplicationCard({
  application,
  actions,
  className,
}: {
  application: ReceivedApplication;
  /** Present only while the practice can still decide. */
  actions?: {
    onShortlist: () => Promise<void>;
    onAccept: () => Promise<void>;
    onReject: (reason: string | undefined) => Promise<void>;
    onMarkViewed: () => Promise<void>;
  };
  className?: string;
}) {
  const { applicant } = application;
  const decision = receivedDecisionLabel(application);

  // Only one of the two can be set.
  const reason = application.rejectionReason
    ? {
        label: "Motif indiqué par le cabinet",
        text: application.rejectionReason,
      }
    : application.withdrawnReason
      ? { label: "Motif du retrait", text: application.withdrawnReason }
      : undefined;

  return (
    <article
      className={cn(
        "rounded-card border border-border bg-surface-2 px-6 py-6 sm:px-8 sm:py-7",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar
            name={applicant.displayName}
            image={applicant.image}
            // The default ring reads as "verified": not on an erased identity.
            className={cn("h-12 w-12", applicant.anonymized && "border-border")}
          />

          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base leading-snug font-medium break-words text-foreground">
              {applicant.displayName}
              {applicant.verified && <VerifiedBadge />}
            </p>

            <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
              <span>{specialtyLabel(applicant.specialty)}</span>
              {applicant.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="h-3.5 w-3.5 text-faint" />
                  {applicant.city}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-end gap-2.5 sm:min-w-44">
          <Badge tone={statusTone(application.status)} size="md">
            {RECEIVED_STATUS_LABELS[application.status]}
          </Badge>
          {decision && (
            <span className="text-right text-control leading-snug text-muted">
              {decision}
            </span>
          )}
        </div>
      </div>

      {applicant.anonymized ? (
        <InlineAlert tone="info" className="mt-7">
          Ce candidat a supprimé son compte : ses données personnelles ont été
          effacées et il ne peut plus être contacté.
        </InlineAlert>
      ) : (
        application.message && (
          <blockquote className="mt-7 border-l-2 border-primary/30 pl-5 text-base leading-loose break-words text-muted">
            {application.message}
          </blockquote>
        )
      )}

      {reason && (
        <p className="mt-6 text-sm leading-relaxed text-muted">
          <span className="font-medium text-foreground">
            {reason.label}&nbsp;:
          </span>{" "}
          {reason.text}
        </p>
      )}

      <MetaRow className="mt-6 border-t border-border pt-5">
        <MetaRowItem dot={application.viewed ? "success" : "muted"}>
          {application.viewed ? "Consultée" : "Non consultée"}
        </MetaRowItem>
        <MetaRowItem>{application.submittedLabel}</MetaRowItem>
        {application.viewedAt && (
          <MetaRowItem>
            Consultée {formatRelativeTime(application.viewedAt)}
          </MetaRowItem>
        )}
      </MetaRow>

      {actions &&
        (application.status === "PENDING" ||
          application.status === "SHORTLISTED") && (
          <ReceivedApplicationActions
            application={application}
            onShortlist={actions.onShortlist}
            onAccept={actions.onAccept}
            onReject={actions.onReject}
            onMarkViewed={actions.onMarkViewed}
          />
        )}
    </article>
  );
}

function statusTone(status: ReceivedApplication["status"]) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "SHORTLISTED":
      return "info" as const;
    case "ACCEPTED":
      return "success" as const;
    case "REJECTED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}
