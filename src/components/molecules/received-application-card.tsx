import { Avatar } from "@/components/atoms/avatar";
import { Badge } from "@/components/atoms/badge";
import { MapPinIcon } from "@/components/atoms/icons";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
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
 * One candidate on a listing the user owns.
 *
 * The `anonymized` branch is the reason this component takes the applicant
 * separately: after an erasure (art. 17 GDPR) the backend blanks the name, the
 * city and the avatar, so the card has to say *why* it is empty rather than
 * render a nameless row the practice would read as a bug.
 *
 * Everything below the identity is optional and none of it is predictable —
 * a message, a reason, a read state — so the card is built as a stack of
 * separated blocks rather than one padded box. Five things in a row with
 * `mt-3` between them read as a wall of text: a practice comparing a dozen
 * candidates needs to find the name first, then the status, then decide whether
 * the message is worth reading at all, and hairlines between the blocks are what
 * let the eye drop the rest.
 */
export function ReceivedApplicationCard({
  application,
  className,
}: {
  application: ReceivedApplication;
  className?: string;
}) {
  const { applicant } = application;
  // Why a decided row reached its status, which is not the status itself: a
  // refused candidate on a cancelled posting was not refused by anybody. Absent
  // while nobody has ruled — the badge above already says « En attente ».
  const decision = receivedDecisionLabel(application);

  // Only one of the two can be set in practice, and they are the same kind of
  // thing — a line of free text the reader needs after the message — so they
  // share one renderer and one rhythm instead of two near-identical blocks.
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
        "rounded-2xl border border-border bg-background/40 px-6 py-6 sm:px-8 sm:py-7",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar
            name={applicant.displayName}
            image={applicant.image}
            // The default avatar wears a `border-primary/60` ring meant to read
            // as "verified member". On an erased identity that ring would
            // claim a verification the backend no longer stands behind.
            className={cn("h-12 w-12", applicant.anonymized && "border-border")}
          />

          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base leading-snug font-bold break-words text-foreground">
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
          <Badge tone={statusTone(application.status)}>
            {RECEIVED_STATUS_LABELS[application.status]}
          </Badge>
          {decision && (
            <span className="text-right text-[13px] leading-snug text-muted">
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
          /* A left rule rather than a filled block: a tinted rectangle inside a
             bordered card is a box in a box, and the quote is the one part of
             the row that is the candidate's own words — it should read as
             quoted, not as another field. */
          <blockquote className="mt-7 border-l-2 border-primary/30 pl-5 text-[15px] leading-loose break-words text-muted">
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

      {/* Read state, not a status: a candidate the practice never opened is
          still waiting to be read, which is the one thing a triage list cannot
          show any other way. */}
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
