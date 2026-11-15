import { Avatar } from "@/components/atoms/avatar";
import { Badge } from "@/components/atoms/badge";
import { VerifiedBadge } from "@/components/molecules/verified-badge";
import { STATUS_META } from "@/lib/applications";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import {
  RECEIVED_STATUS_LABELS,
  type ReceivedApplication,
  specialtyLabel,
} from "@/lib/listings";

/**
 * A listing's candidates as the console's table. A row is a choice, not a
 * link: picking it shows the candidate in the panel beside the table.
 */
export function ReceivedApplicationsTable({
  applications,
  selectedId,
  onSelect,
}: {
  applications: readonly ReceivedApplication[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="table-flush overflow-x-auto">
      <table className="table listings-table">
        <thead>
          <tr>
            <th scope="col">Candidat</th>
            <th scope="col">Envoyée</th>
            <th scope="col">Lecture</th>
            <th scope="col" className="text-right">
              Statut
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const { applicant } = application;
            const selected = application.id === selectedId;
            const place = [specialtyLabel(applicant.specialty), applicant.city]
              .filter(Boolean)
              .join(" · ");

            return (
              <tr
                key={application.id}
                className={cn(
                  "row-enter cursor-pointer",
                  selected && "is-selected",
                )}
                onClick={() => onSelect(application.id)}
              >
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={applicant.displayName}
                      image={applicant.image}
                      className={cn(
                        "size-8 text-xs",
                        applicant.anonymized && "border-border",
                      )}
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(application.id);
                        }}
                        className="flex max-w-[15rem] items-center gap-2 text-left font-medium text-foreground transition-colors hover:text-primary"
                      >
                        <span className="truncate">
                          {applicant.displayName}
                        </span>
                        {applicant.verified && (
                          <>
                            <VerifiedBadge label="" />
                            <span className="sr-only">(vérifié)</span>
                          </>
                        )}
                      </button>
                      <p className="max-w-[15rem] truncate text-xs text-muted">
                        {place}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="whitespace-nowrap text-foreground">
                  {formatRelativeTime(application.raw.createdAt)}
                </td>

                <td className="whitespace-nowrap">
                  {application.viewed ? (
                    <span className="text-foreground">Lue</span>
                  ) : (
                    <span className="text-muted">Non lue</span>
                  )}
                </td>

                <td className="text-right whitespace-nowrap">
                  <Badge
                    tone={STATUS_META[application.status].badgeTone}
                    variant="plain"
                  >
                    {RECEIVED_STATUS_LABELS[application.status]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
