import { Card } from "@/components/atoms/card";
import { ApplicationDetailHeader } from "@/components/molecules/application-detail-header";
import { ApplicationListingDetails } from "@/components/molecules/application-listing-details";
import { ApplicationMessage } from "@/components/molecules/application-message";
import { ApplicationStatusBanner } from "@/components/molecules/application-status-banner";
import { ApplicationTimeline } from "@/components/molecules/application-timeline";
import type { ApplicationEntry } from "@/lib/applications";

function DetailSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 border-t border-border pt-8 sm:mt-10 sm:pt-10">
      {children}
    </div>
  );
}

/** Full application detail — read-only (practice actions live on "Mes offres"). */
export function ApplicationDetail({
  application,
  onMessageSaved,
}: {
  application: ApplicationEntry;
  onMessageSaved?: (updated: ApplicationEntry | null) => void;
}) {
  return (
    <Card className="p-6 sm:p-8">
      <ApplicationDetailHeader application={application} />

      <ApplicationStatusBanner application={application} className="mt-6" />

      <DetailSection>
        <ApplicationListingDetails listing={application.listing} />
      </DetailSection>

      <DetailSection>
        <ApplicationMessage
          applicationId={application.id}
          message={application.message}
          canEdit={application.status === "PENDING"}
          onSaved={onMessageSaved}
        />
      </DetailSection>

      <DetailSection>
        <ApplicationTimeline application={application} />
      </DetailSection>
    </Card>
  );
}
