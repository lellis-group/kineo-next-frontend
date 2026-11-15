import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  ShieldIcon,
} from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { StatChip } from "@/components/molecules/panel-chrome";
import { RailDistribution } from "@/components/molecules/rail-distribution";
import { RailEmpty } from "@/components/molecules/rail-empty";
import { RailGauge } from "@/components/molecules/rail-gauge";
import { STATUS_MARKS } from "@/components/organisms/my-listings-rail";
import type { DashboardData, ReactivityFigure } from "@/lib/dashboard";
import { plural } from "@/lib/format";

const FIGURE_ICONS: Record<ReactivityFigure["icon"], typeof FileTextIcon> = {
  file: FileTextIcon,
  clock: ClockIcon,
  check: CheckIcon,
  alert: AlertTriangleIcon,
};

/** A panel's corner arrow that goes somewhere: the full screen behind the summary. */
function PanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-m-1.5 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <ArrowUpRightIcon className="size-4" strokeWidth={1.5} />
    </Link>
  );
}

/**
 * The summary panels down the left of the member's home: the applications
 * sent, the listings published, and a tip. Every figure is a server total.
 */
export function DashboardRail({
  reactivity,
  listings,
}: {
  reactivity: DashboardData["reactivity"];
  listings: DashboardData["listings"];
}) {
  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="Mes candidatures"
        action={
          <PanelLink href="/applications" label="Voir mes candidatures" />
        }
      >
        <RailGauge percent={reactivity.rate} caption={reactivity.rateCaption}>
          {reactivity.figures.map((figure) => {
            const Icon = FIGURE_ICONS[figure.icon];
            return (
              <StatChip
                key={figure.label}
                icon={<Icon className="size-3.5" />}
                label={figure.label}
                value={figure.value}
              />
            );
          })}
        </RailGauge>
        <p className="mt-1 text-center text-2xs text-faint">
          Taux de réponse des cabinets
        </p>
      </Panel>

      <Panel
        title={
          <>
            Mes annonces{" "}
            <span className="text-muted tabular-nums">{listings.total}</span>
          </>
        }
        action={<PanelLink href="/listings/mine" label="Voir mes offres" />}
      >
        {listings.rows.length === 0 ? (
          <RailEmpty>Aucune annonce publiée.</RailEmpty>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              <span className="text-foreground tabular-nums">
                {listings.recruiting}
              </span>{" "}
              en recherche d&apos;un remplaçant
            </p>
            <RailDistribution
              rows={listings.rows.map((row) => {
                const Mark = STATUS_MARKS[row.status];
                return {
                  key: row.status,
                  mark: <Mark className="size-4 shrink-0 text-muted" />,
                  label: row.shortLabel,
                  title: `${row.label} — ${row.count} annonce${plural(row.count)}`,
                  count: row.count,
                  percent: row.percent,
                };
              })}
            />
          </>
        )}
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary"
            >
              <ShieldIcon className="size-3.5" />
            </span>
            {reactivity.tipTitle}
          </span>
        }
      >
        <p className="text-sm leading-relaxed text-muted">{reactivity.tip}</p>
      </Panel>
    </div>
  );
}
