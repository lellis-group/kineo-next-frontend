import type { ApplicationEntry } from "@/lib/applications";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

interface TimelineEvent {
  label: string;
  date: string;
  /** Dot color — semantic: sent (primary), viewed (success), answered (info). */
  dotClass: string;
}

export function ApplicationTimeline({
  application,
}: {
  application: ApplicationEntry;
}) {
  const events: TimelineEvent[] = [
    {
      label: "Candidature envoyée",
      date: formatDateTime(application.createdAt),
      dotClass: "bg-primary",
    },
  ];

  if (application.viewedAt) {
    events.push({
      label: "Consultée par le cabinet",
      date: formatDateTime(application.viewedAt),
      dotClass: "bg-success",
    });
  }

  if (application.respondedAt) {
    events.push({
      label: "Réponse du cabinet",
      date: formatDateTime(application.respondedAt),
      dotClass: "bg-info",
    });
  }

  return (
    <section>
      <h2 className="text-sm font-bold text-foreground">Suivi</h2>
      <ol className="mt-3 divide-y divide-border">
        {events.map((event) => (
          <li
            key={event.label}
            className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  event.dotClass,
                )}
              />
              <span className="min-w-0 flex-1 text-sm break-words text-foreground">
                {event.label}
              </span>
            </span>
            <span className="max-w-[45%] shrink-0 text-right text-xs break-words text-muted">
              {event.date}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
