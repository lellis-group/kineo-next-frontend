import { ArrowRightIcon } from "@/components/atoms/icons";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import type { ApplicationEntry } from "@/lib/applications";

export function ApplicationCardFooter({
  application,
}: {
  application: ApplicationEntry;
}) {
  return (
    <div className="mt-5 flex flex-col gap-2.5 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <MetaRow className="flex-1">
        <MetaRowItem dot={application.viewed ? "success" : "danger"}>
          {application.viewed ? "Consultée" : "Non consultée"}
        </MetaRowItem>
        <MetaRowItem>{application.submittedLabel}</MetaRowItem>
      </MetaRow>

      <span className="flex shrink-0 items-center gap-1.5 self-start text-[13px] font-medium text-faint transition-colors group-hover:text-primary sm:self-auto">
        Voir le détail
        <ArrowRightIcon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </div>
  );
}
