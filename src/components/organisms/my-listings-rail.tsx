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
import {
  type BarRow,
  SpecialtyBars,
} from "@/components/molecules/specialty-bars";
import { plural } from "@/lib/format";
import {
  countRecruitingListings,
  LISTING_STATUS_META,
  LISTING_STATUS_ORDER,
  type ListingStatusCounts,
  type MyListing,
  RECRUITING_STATUSES,
} from "@/lib/listings";
import { SPECIALTY_LABELS, SPECIALTY_SHORT_LABELS } from "@/lib/profile";
import type { Specialty } from "@/lib/types/api";

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
  const recruiting = countRecruitingListings(listings);
  const recruitingPercent =
    listings.length > 0 ? Math.round((recruiting / listings.length) * 100) : 0;

  // Active candidates only: a refused one no longer holds a slot.
  const activeCandidates = listings.reduce(
    (sum, listing) => sum + listing.applicationsCount,
    0,
  );
  const urgent = listings.filter((listing) => listing.urgent).length;

  const filled = counts.FILLED;
  const filledPercent =
    counts.total > 0 ? Math.round((filled / counts.total) * 100) : 0;

  const recruitingTotal = LISTING_STATUS_ORDER.reduce(
    (sum, status) =>
      sum + (RECRUITING_STATUSES.has(status) ? counts[status] : 0),
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Recrutement" action={<PanelExpand />}>
        <RailGauge
          percent={recruitingPercent}
          caption={`${recruiting} annonce${plural(
            recruiting,
          )} en cours sur ${listings.length} (cette page)`}
        >
          <StatChip
            icon={<ClockIcon className="size-3.5" />}
            label="En cours"
            value={String(recruiting)}
          />
          <StatChip
            icon={<FileTextIcon className="size-3.5" />}
            label="Candidatures"
            value={String(activeCandidates)}
          />
          <StatChip
            icon={<AlertTriangleIcon className="size-3.5" />}
            label="Urgentes"
            value={String(urgent)}
          />
          <StatChip
            icon={<CheckIcon className="size-3.5" />}
            label="Pourvues"
            value={String(filled)}
          />
        </RailGauge>
      </Panel>

      <Panel title="Répartition par statut" action={<PanelExpand />}>
        <StatusDistribution counts={counts} />
      </Panel>

      <Panel title="Volume publié" action={<PanelExpand />}>
        {counts.total === 0 ? (
          <RailEmpty>Aucune annonce publiée.</RailEmpty>
        ) : (
          <>
            <RailVolume
              leading={[
                { label: "En cours", value: recruitingTotal },
                { label: "Autres", value: counts.total - recruitingTotal },
              ]}
              total={counts.total}
              totalLabel="annonces publiées"
              badge={`${filledPercent} % pourvues`}
            />

            <SpecialtyBars rows={specialtyBars(listings)} />
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

/** Whole-collection figures; empty statuses are dropped rather than drawn at zero. */
function StatusDistribution({ counts }: { counts: ListingStatusCounts }) {
  const rows = LISTING_STATUS_ORDER.map((status) => ({
    status,
    count: counts[status] ?? 0,
  })).filter((row) => row.count > 0);

  if (rows.length === 0) {
    return <RailEmpty>Aucune annonce à répartir.</RailEmpty>;
  }

  const percent = (count: number) =>
    Math.round((count / (counts.total || 1)) * 100);

  return (
    <RailDistribution
      rows={rows.map(
        (row): RailDistributionRow => ({
          key: row.status,
          mark: <StatusMark status={row.status} />,
          label: LISTING_STATUS_META[row.status].shortLabel,
          title: LISTING_STATUS_META[row.status].label,
          count: row.count,
          percent: percent(row.count),
        }),
      )}
    />
  );
}

function StatusMark({ status }: { status: keyof typeof LISTING_STATUS_META }) {
  const Mark = STATUS_MARKS[status];
  return <Mark className="size-4 shrink-0 text-muted" />;
}

/** The specialties on screen, ranked (the tallest bar is highlighted). */
function specialtyBars(listings: readonly MyListing[]): BarRow[] {
  const counts = new Map<Specialty, number>();
  for (const listing of listings) {
    counts.set(listing.specialty, (counts.get(listing.specialty) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SPECIALTY_BARS)
    .map(([specialty, count]) => ({
      key: specialty,
      label: SPECIALTY_LABELS[specialty],
      short: SPECIALTY_SHORT_LABELS[specialty],
      count,
    }));
}

const MAX_SPECIALTY_BARS = 6;
