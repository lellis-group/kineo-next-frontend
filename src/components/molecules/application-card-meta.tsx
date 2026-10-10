import { MapPinIcon } from "@/components/atoms/icons";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import { type ApplicationEntry, practiceLabel } from "@/lib/applications";

export function ApplicationCardMeta({
  application,
}: {
  application: ApplicationEntry;
}) {
  const label = practiceLabel(application.listing);

  if (!label) {
    return (
      <p className="mt-2 text-[13px] text-muted sm:text-sm">
        {application.submittedLabel}
      </p>
    );
  }

  return (
    <MetaRow className="mt-2">
      <MetaRowItem icon={MapPinIcon} truncate>
        {label}
      </MetaRowItem>
    </MetaRow>
  );
}
