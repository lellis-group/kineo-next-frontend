import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import { CalendarIcon } from "@/components/atoms/icons";
import { ApplicationCardFooter } from "@/components/molecules/application-card-footer";
import { ApplicationCardMeta } from "@/components/molecules/application-card-meta";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import { type ApplicationEntry, STATUS_META } from "@/lib/applications";

/** One application in the list — whole-card link to its detail page. */
export function ApplicationCard({
  application,
}: {
  application: ApplicationEntry;
}) {
  const meta = STATUS_META[application.status];
  const { dateRange } = application.listing;

  return (
    <Link
      href={`/applications/${application.id}`}
      className="group block w-full rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-hover sm:p-7"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug font-bold break-words text-foreground sm:text-lg">
            {application.listing.title}
          </p>
          <ApplicationCardMeta application={application} />
        </div>
        <Badge tone={meta.badgeTone} className="w-fit shrink-0 sm:w-auto">
          {meta.label}
        </Badge>
      </div>

      {dateRange && (
        <MetaRow className="mt-4 text-foreground">
          <MetaRowItem icon={CalendarIcon}>{dateRange}</MetaRowItem>
        </MetaRow>
      )}

      {application.message && (
        <div className="mt-3 rounded-xl bg-background/40 px-3 py-2.5 sm:mt-4 sm:px-4 sm:py-3">
          <p className="line-clamp-2 overflow-hidden text-[13px] leading-snug break-words text-muted sm:line-clamp-3 sm:text-sm sm:leading-relaxed">
            <span aria-hidden="true">«&nbsp;</span>
            {application.message}
            <span aria-hidden="true">&nbsp;»</span>
          </p>
        </div>
      )}

      <ApplicationCardFooter application={application} />
    </Link>
  );
}
