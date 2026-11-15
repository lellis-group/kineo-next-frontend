import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import {
  CheckIcon,
  FileTextIcon,
  StarIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { cn } from "@/lib/cn";
import type { ActivityEntry } from "@/lib/dashboard";
import { SOFT_PANEL, SOFT_PANEL_BODY } from "@/lib/layout";

const ACTIVITY_ICONS: Record<
  ActivityEntry["icon"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  users: UsersIcon,
  check: CheckIcon,
  star: StarIcon,
  file: FileTextIcon,
};

/** Shared by the header row and the entries, so the columns line up. */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_9rem_8.5rem_6.5rem]";

/**
 * The member's latest applications as a board table: what happened, the
 * period, the status chip, when. Below `md` the period and the time fold
 * under the message.
 */
export function ActivityFeed({
  items,
  title = "Activité récente",
  emptyMessage,
  seeAllHref,
}: {
  items: ActivityEntry[];
  title?: string;
  /** Message shown when there is no activity (onboarding). */
  emptyMessage?: string;
  seeAllHref?: string;
}) {
  return (
    <Panel
      title={title}
      flush
      action={
        seeAllHref &&
        items.length > 0 && (
          <Link
            href={seeAllHref}
            className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            Tout voir
          </Link>
        )
      }
    >
      {items.length === 0 ? (
        <div className="px-5 pb-5 sm:px-6">
          <div className={SOFT_PANEL}>
            <p className={SOFT_PANEL_BODY}>{emptyMessage}</p>
            <div className="flex justify-center pb-6">
              <Button href="/listings" variant="outline">
                Parcourir les annonces
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              ROW_GRID,
              "border-y border-border bg-surface-2 py-2.5 text-xs text-muted",
            )}
          >
            <span>Candidature</span>
            <span className="hidden md:block">Période</span>
            <span className="text-right md:text-left">Statut</span>
            <span className="hidden text-right md:block">Quand</span>
          </div>
          <ul>
            {items.map((entry) => (
              <li
                key={entry.id}
                className="border-b border-border last:border-b-0"
              >
                <ActivityRow entry={entry} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const Icon = ACTIVITY_ICONS[entry.icon];

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm leading-snug break-words text-muted">
            {entry.message.map((segment, index) =>
              segment.bold ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: static segments, stable order
                <strong key={index} className="font-medium text-foreground">
                  {segment.text}
                </strong>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: static segments, stable order
                <span key={index}>{segment.text}</span>
              ),
            )}
          </span>
          {/* From `md` the period and the time have their own columns. */}
          <span className="mt-0.5 block truncate text-xs text-faint md:hidden">
            {[entry.place, entry.period, entry.timestamp]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {entry.place && (
            <span className="mt-0.5 hidden truncate text-xs text-faint md:block">
              {entry.place}
            </span>
          )}
        </span>
      </span>
      <span className="hidden text-sm text-muted tabular-nums md:block">
        {entry.period ?? "—"}
      </span>
      <Badge
        tone={entry.status.tone}
        variant="plain"
        className="justify-self-end md:justify-self-start"
      >
        {entry.status.label}
      </Badge>
      <span className="hidden text-right text-xs text-muted md:block">
        {entry.timestamp}
      </span>
    </>
  );

  const classes = cn(ROW_GRID, "items-center py-4");

  return entry.href ? (
    <Link
      href={entry.href}
      className={cn(
        classes,
        "transition-colors hover:bg-surface-hover focus-visible:outline-offset-[-2px]",
      )}
    >
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
