import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { FileTextIcon } from "@/components/atoms/icons";
import { ListingPeriodCell } from "@/components/molecules/listing-table-cells";
import { ProgressTrack } from "@/components/molecules/progress-track";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { ApplicationRow } from "@/components/organisms/application-row";
import {
  type ApplicationEntry,
  applicationProgress,
  applicationStatus,
  isAwaitingDecision,
} from "@/lib/applications";
import { formatRelativeTime } from "@/lib/format";

const COLUMNS = 5;

interface RowGroup {
  title?: string;
  rows: ApplicationEntry[];
}

/**
 * Under « Toutes » the page's rows split into the ones still waiting on a
 * practice and the settled ones — within the page on screen, since the
 * order and the pagination are the server's.
 */
function groupRows(
  applications: readonly ApplicationEntry[],
  grouped: boolean,
): RowGroup[] {
  if (!grouped) return [{ rows: [...applications] }];

  return [
    {
      title: "En cours",
      rows: applications.filter((entry) => isAwaitingDecision(entry.status)),
    },
    {
      title: "Terminées",
      rows: applications.filter((entry) => !isAwaitingDecision(entry.status)),
    },
  ].filter((group) => group.rows.length > 0);
}

/**
 * The member's applications as the console's table: the posting, its
 * period, the journey so far, when it was sent, its status. Each row opens
 * `/applications/[id]`. Below `sm`, `ApplicationsMobileList` takes over.
 */
export function ApplicationsTable({
  applications,
  grouped,
}: {
  applications: readonly ApplicationEntry[];
  grouped: boolean;
}) {
  const router = useRouter();

  return (
    <div className="table-flush hidden overflow-x-auto sm:block">
      <table className="table listings-table">
        <thead>
          <tr>
            <th scope="col" className="has-gutter">
              Annonce
            </th>
            <th scope="col">Période</th>
            <th scope="col">Progression</th>
            <th scope="col">Envoyée</th>
            <th scope="col" className="text-right">
              Statut
            </th>
          </tr>
        </thead>

        {groupRows(applications, grouped).map((group) => (
          <tbody key={group.title ?? "all"}>
            {group.title && (
              <tr className="pointer-events-none">
                <th
                  scope="rowgroup"
                  colSpan={COLUMNS}
                  className="border-b border-border bg-surface-2/50 py-2.5 text-left text-xs font-medium text-muted"
                >
                  {group.title}{" "}
                  <span className="text-faint tabular-nums">
                    {group.rows.length}
                  </span>
                </th>
              </tr>
            )}

            {group.rows.map((application) => {
              const href = `/applications/${application.id}`;
              const { listing } = application;
              const status = applicationStatus(application);
              const practice = [listing.practiceName, listing.practiceCity]
                .filter(Boolean)
                .join(" · ");

              return (
                <tr
                  key={application.id}
                  className="row-enter cursor-pointer"
                  onClick={(event) => {
                    // The title is a real link: don't navigate twice.
                    if ((event.target as Element).closest("a, button")) return;
                    router.push(href);
                  }}
                >
                  <td>
                    <div className="flex items-start gap-[var(--cell-gap)]">
                      {listing.specialty ? (
                        <SpecialtyIcon
                          specialty={listing.specialty}
                          className="size-[var(--cell-icon)] shrink-0 text-foreground"
                        />
                      ) : (
                        <FileTextIcon className="size-[var(--cell-icon)] shrink-0 text-muted" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={href}
                          title={listing.title}
                          className="block max-w-[17rem] truncate leading-[var(--cell-icon)] font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {listing.title}
                        </Link>
                        <p className="max-w-[17rem] truncate text-xs text-muted">
                          {practice || "Cabinet non communiqué"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td>
                    {listing.startDate && listing.endDate ? (
                      <ListingPeriodCell
                        dateRange={listing.dateRange}
                        startDate={listing.startDate}
                        endDate={listing.endDate}
                      />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  <td className="w-[13rem] min-w-[11rem]">
                    <ProgressTrack
                      compact
                      steps={applicationProgress(application)}
                    />
                  </td>

                  <td className="whitespace-nowrap text-foreground">
                    {formatRelativeTime(application.createdAt)}
                  </td>

                  <td className="text-right whitespace-nowrap">
                    <Badge tone={status.tone} variant="plain">
                      {status.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** The narrow-screen counterpart; the table is removed by CSS. */
export function ApplicationsMobileList({
  applications,
}: {
  applications: readonly ApplicationEntry[];
}) {
  return (
    <ul className="-mx-5 divide-y divide-border border-t border-border sm:hidden">
      {applications.map((application) => (
        <li key={application.id}>
          <ApplicationRow application={application} />
        </li>
      ))}
    </ul>
  );
}
