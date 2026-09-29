import { Avatar } from "@/components/atoms/avatar";
import { Badge } from "@/components/atoms/badge";
import { MapPinIcon, ShieldIcon } from "@/components/atoms/icons";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { cn } from "@/lib/cn";
import {
  RECEIVED_STATUS_LABELS,
  type ReceivedApplication,
  specialtyLabel,
} from "@/lib/listings";

/**
 * One candidate on a listing the user owns.
 *
 * The `anonymized` branch is the reason this component takes the applicant
 * separately: after an erasure (art. 17 GDPR) the backend blanks the name, the
 * city and the avatar, so the card has to say *why* it is empty rather than
 * render a nameless row the practice would read as a bug.
 */
export function ReceivedApplicationCard({
  application,
  className,
}: {
  application: ReceivedApplication;
  className?: string;
}) {
  const { applicant } = application;

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-background/40 px-4 py-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={applicant.displayName}
            image={applicant.image}
            // The default avatar wears a `border-primary/60` ring meant to read
            // as "verified member". On an erased identity that ring would
            // claim a verification the backend no longer stands behind.
            className={applicant.anonymized ? "border-border" : undefined}
          />

          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold break-words text-foreground">
              {applicant.displayName}
              {applicant.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  Vérifié
                </span>
              )}
            </p>

            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              <span>{specialtyLabel(applicant.specialty)}</span>
              {applicant.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="h-3.5 w-3.5 text-faint" />
                  {applicant.city}
                </span>
              )}
            </p>
          </div>
        </div>

        <Badge tone={statusTone(application.status)} className="shrink-0">
          {RECEIVED_STATUS_LABELS[application.status]}
        </Badge>
      </div>

      {applicant.anonymized ? (
        <InlineAlert tone="info" className="mt-3">
          Ce candidat a supprimé son compte : ses données personnelles ont été
          effacées et il ne peut plus être contacté.
        </InlineAlert>
      ) : (
        application.message && (
          <p className="mt-3 rounded-xl bg-surface-2/60 px-3 py-2.5 text-[13px] leading-relaxed break-words text-muted sm:text-sm">
            <span aria-hidden="true">«&nbsp;</span>
            {application.message}
            <span aria-hidden="true">&nbsp;»</span>
          </p>
        )
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <span
          aria-hidden="true"
          className="h-1 w-1 shrink-0 rounded-full bg-muted"
        />
        {application.submittedLabel}
      </p>
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
