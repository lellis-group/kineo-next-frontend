import { FileTextIcon } from "@/components/atoms/icons";
import { ApplicationCard } from "@/components/molecules/application-card";
import { EmptyState } from "@/components/organisms/empty-state";
import type { ApplicationEntry } from "@/lib/applications";

export function ApplicationsList({
  applications,
}: {
  applications: ApplicationEntry[];
}) {
  // The page-level empty state is handled by `ApplicationsView`; reaching here
  // with nothing means the active filter hid everything. Mirrors the listings
  // screen, which shows the same state the same way.
  if (applications.length === 0) {
    return (
      <EmptyState
        icon={<FileTextIcon className="h-8 w-8 text-primary" />}
        title="Aucune candidature dans ce statut"
        description="Changez de filtre pour voir vos autres candidatures."
      />
    );
  }

  return (
    <ul className="space-y-5">
      {applications.map((application) => (
        <li key={application.id}>
          <ApplicationCard application={application} />
        </li>
      ))}
    </ul>
  );
}
