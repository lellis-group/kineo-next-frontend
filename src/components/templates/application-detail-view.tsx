import { ApplicationWithdraw } from "@/components/molecules/application-withdraw";
import { BackLink } from "@/components/molecules/back-link";
import { ApplicationDetail } from "@/components/organisms/application-detail";
import {
  type ApplicationEntry,
  WITHDRAWABLE_STATUSES,
} from "@/lib/applications";

export function ApplicationDetailView({
  application,
  onSaveMessage,
  onWithdraw,
}: {
  application: ApplicationEntry;
  onSaveMessage: (message: string) => Promise<void>;
  onWithdraw: (reason: string) => Promise<void>;
}) {
  const canWithdraw = WITHDRAWABLE_STATUSES.has(application.status);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <BackLink href="/applications">Retour à mes candidatures</BackLink>

      <div className="mt-8">
        <ApplicationDetail
          application={application}
          onSaveMessage={onSaveMessage}
        />
      </div>

      {canWithdraw && (
        <ApplicationWithdraw onWithdraw={onWithdraw} className="mt-6" />
      )}
    </div>
  );
}
