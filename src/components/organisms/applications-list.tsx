import { Card } from "@/components/atoms/card";
import { EmptyState } from "@/components/molecules/empty-state";
import { ApplicationRow } from "@/components/organisms/application-row";
import { type ApplicationEntry, isAwaitingDecision } from "@/lib/applications";

/**
 * The page's applications. Under « Toutes » they split into the ones still
 * waiting on a practice and the settled ones — within the page on screen,
 * since the order and the pagination are the server's.
 */
export function ApplicationsList({
  applications,
  grouped,
}: {
  applications: ApplicationEntry[];
  grouped: boolean;
}) {
  // The page-level empty state is `ApplicationsView`'s; here the filter hid everything.
  if (applications.length === 0) {
    return (
      <EmptyState
        title="Aucune candidature dans ce statut"
        description="Changez de filtre pour voir vos autres candidatures."
      />
    );
  }

  if (!grouped) {
    return <RowGroup applications={applications} />;
  }

  const open = applications.filter((entry) => isAwaitingDecision(entry.status));
  const settled = applications.filter(
    (entry) => !isAwaitingDecision(entry.status),
  );

  return (
    <div className="flex flex-col gap-8">
      {open.length > 0 && <RowGroup title="En cours" applications={open} />}
      {settled.length > 0 && (
        <RowGroup title="Terminées" applications={settled} />
      )}
    </div>
  );
}

function RowGroup({
  title,
  applications,
}: {
  title?: string;
  applications: ApplicationEntry[];
}) {
  const list = (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      <ul className="divide-y divide-border">
        {applications.map((application) => (
          <li key={application.id}>
            <ApplicationRow application={application} />
          </li>
        ))}
      </ul>
    </Card>
  );

  if (!title) return list;

  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2 text-sm font-medium text-foreground">
        {title}
        <span className="text-muted tabular-nums">{applications.length}</span>
      </h2>
      {list}
    </section>
  );
}
