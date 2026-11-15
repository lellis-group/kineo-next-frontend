import Link from "next/link";
import { ArrowRightIcon } from "@/components/atoms/icons";
import { ProgressTrack } from "@/components/molecules/progress-track";
import {
  type ApplicationEntry,
  applicationProgress,
  practiceLabel,
} from "@/lib/applications";

/**
 * One application as a row: the posting on the left, its journey in the
 * middle, the way to its detail on the right. The whole row is the link.
 */
export function ApplicationRow({
  application,
}: {
  application: ApplicationEntry;
}) {
  const practice = practiceLabel(application.listing);
  const { dateRange } = application.listing;

  return (
    <Link
      href={`/applications/${application.id}`}
      className="group grid gap-x-8 gap-y-5 px-5 py-5 transition-colors hover:bg-surface-hover focus-visible:outline-offset-[-2px] sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-foreground">
          {application.listing.title}
        </p>
        {practice && (
          <p className="mt-0.5 truncate text-sm text-muted">{practice}</p>
        )}
        <p className="mt-1.5 truncate text-xs text-faint">
          {[dateRange, application.submittedLabel].filter(Boolean).join(" · ")}
        </p>
      </div>

      <ProgressTrack steps={applicationProgress(application)} />

      <ArrowRightIcon
        aria-hidden="true"
        className="hidden size-4 shrink-0 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary md:block"
      />
    </Link>
  );
}
