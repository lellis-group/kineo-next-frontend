import type { ComponentType, SVGProps } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand, StatChip } from "@/components/molecules/panel-chrome";
import {
  RailDistribution,
  type RailDistributionRow,
} from "@/components/molecules/rail-distribution";
import { RailEmpty } from "@/components/molecules/rail-empty";
import { RailGauge } from "@/components/molecules/rail-gauge";
import { RailVolume } from "@/components/molecules/rail-volume";
import { SpecialtyBars } from "@/components/molecules/specialty-bars";
import { plural } from "@/lib/format";
import {
  adaptMyListingsRail,
  type LISTING_STATUS_META,
  type ListingStatusCounts,
  type MyListing,
} from "@/lib/listings";

/**
 * The summary panels down the left of the practice's board. `counts` covers
 * the whole collection; every other figure is derived from the page on screen
 * and labelled « cette page ».
 */
export function MyListingsRail({
  listings,
  counts,
}: {
  listings: readonly MyListing[];
  counts: ListingStatusCounts;
}) {
  const rail = adaptMyListingsRail(listings, counts);

  const statusRows: RailDistributionRow[] = rail.statusRows.map((row) => ({
    key: row.status,
    mark: <StatusMark status={row.status} />,
    label: row.shortLabel,
    title: row.label,
    count: row.count,
    percent: row.percent,
  }));

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Recrutement" action={<PanelExpand />}>
        <RailGauge
          percent={rail.recruitingPercent}
          caption={`${rail.recruiting} annonce${plural(
            rail.recruiting,
          )} en cours sur ${listings.length} (cette page)`}
        >
          <StatChip
            icon={<ClockIcon className="size-3.5" />}
            label="En cours"
            value={String(rail.recruiting)}
          />
          <StatChip
            icon={<FileTextIcon className="size-3.5" />}
            label="Candidatures"
            value={String(rail.activeCandidates)}
          />
          <StatChip
            icon={<AlertTriangleIcon className="size-3.5" />}
            label="Urgentes"
            value={String(rail.urgent)}
          />
          <StatChip
            icon={<CheckIcon className="size-3.5" />}
            label="Pourvues"
            value={String(rail.filled)}
          />
        </RailGauge>
      </Panel>

      <Panel title="Répartition par statut" action={<PanelExpand />}>
        {statusRows.length === 0 ? (
          <RailEmpty>Aucune annonce à répartir.</RailEmpty>
        ) : (
          <RailDistribution rows={statusRows} />
        )}
      </Panel>

      <Panel title="Volume publié" action={<PanelExpand />}>
        {counts.total === 0 ? (
          <RailEmpty>Aucune annonce publiée.</RailEmpty>
        ) : (
          <>
            <RailVolume
              leading={[
                { label: "En cours", value: rail.recruitingTotal },
                { label: "Autres", value: counts.total - rail.recruitingTotal },
              ]}
              total={counts.total}
              totalLabel="annonces publiées"
              badge={`${rail.filledPercent} % pourvues`}
            />

            <SpecialtyBars rows={rail.specialtyBars} />
            <p className="mt-2 text-2xs leading-tight text-faint">
              Spécialités de cette page
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}

/**
 * A mark per status. Lives here rather than in `LISTING_STATUS_META`, which the
 * server imports. Exhaustive by type; `my-listings-rail.spec.ts` checks it too.
 */
export const STATUS_MARKS: Record<
  keyof typeof LISTING_STATUS_META,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  DRAFT: LayersIcon,
  OPEN: ActivityIcon,
  IN_DISCUSSION: FileTextIcon,
  FULL: UsersIcon,
  FILLED: CheckIcon,
  CLOSED: ClockIcon,
  CLOSED_NO_CANDIDATE: ClockIcon,
  CANCELLED: ClockIcon,
};

function StatusMark({ status }: { status: keyof typeof LISTING_STATUS_META }) {
  const Mark = STATUS_MARKS[status];
  return <Mark className="size-4 shrink-0 text-muted" />;
}
