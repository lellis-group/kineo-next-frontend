import { MapPinIcon } from "@/components/atoms/icons";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import type { ApplicationEntry } from "@/lib/applications";

/** Practice (name · city) under the title; falls back to the submission time. */
export function ApplicationCardMeta({
  application,
}: {
  application: ApplicationEntry;
}) {
  const { practiceName, practiceCity } = application.listing;
  const practiceLabel = practiceName
    ? `${practiceName}${practiceCity ? ` · ${practiceCity}` : ""}`
    : practiceCity;

  if (!practiceLabel) {
    return (
      <p className="mt-2 text-[13px] text-muted sm:text-sm">
        {application.submittedLabel}
      </p>
    );
  }

  return (
    <MetaRow className="mt-2">
      <MetaRowItem icon={MapPinIcon} truncate>
        {practiceLabel}
      </MetaRowItem>
    </MetaRow>
  );
}
