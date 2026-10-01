import { MapPinIcon } from "@/components/atoms/icons";
import { MetaRow, MetaRowItem } from "@/components/molecules/meta-row";
import type { ApplicationEntry } from "@/lib/applications";

/** Listing title and targeted practice — the status lives in the banner below. */
export function ApplicationDetailHeader({
  application,
}: {
  application: ApplicationEntry;
}) {
  const { listing } = application;
  const practiceLabel = listing.practiceName
    ? `${listing.practiceName}${listing.practiceCity ? ` · ${listing.practiceCity}` : ""}`
    : listing.practiceCity;

  return (
    <div className="min-w-0">
      <h1 className="text-xl leading-snug font-bold tracking-tight text-balance text-foreground sm:text-2xl">
        {listing.title}
      </h1>
      {practiceLabel && (
        <MetaRow className="mt-2">
          <MetaRowItem icon={MapPinIcon} truncate>
            {practiceLabel}
          </MetaRowItem>
        </MetaRow>
      )}
    </div>
  );
}
