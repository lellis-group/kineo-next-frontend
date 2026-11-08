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
 * The three summary panels down the left of the practice's board — the reference
 * dashboard's column, drawn from what this screen actually knows.
 *
 * Two kinds of number live here and the difference is stated on each panel rather
 * than left for the reader to guess:
 *
 * - `counts` is the only aggregate the endpoint answers, and it covers the
 *   **whole collection**, so the status panel says the same thing whatever page
 *   is on screen;
 * - everything else — candidatures, urgentes, specialties — can only be derived
 *   from the **page on screen**, and is labelled « cette page ». A practice
 *   paging through forty postings must not read « 3 candidatures » as a fact
 *   about all forty, which is exactly what the same figures on the browse screen
 *   *do* mean: there the panels are fed by an aggregate, and here they are not.
 *
 * The three panel bodies are molecules shared with the browse feed
 * (`RailGauge`, `RailDistribution`, `RailVolume`): the two rails are the same
 * column of panels filled from different numbers, and they used to be written
 * out twice.
 */
export function MyListingsRail({
  listings,
  counts,
}: {
  /** The page on screen — the source of every page-scoped figure. */
  listings: readonly MyListing[];
  counts: ListingStatusCounts;
}) {
  const recruiting = countRecruitingListings(listings);
  const recruitingPercent =
    listings.length > 0 ? Math.round((recruiting / listings.length) * 100) : 0;

  // Active candidates only, never the applications ever received: a shortlisted
  // candidate and a refused one are both « candidatures », and only one of them
  // is still holding a slot the practice has to fill.
  const activeCandidates = listings.reduce(
    (sum, listing) => sum + listing.applicationsCount,
    0,
  );
  const urgent = listings.filter((listing) => listing.urgent).length;

  // Whole collection, like the two panels below: the status breakdown is the one
  // thing this screen is told about everything it owns.
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

            {/*
              Bars over the page's specialties.

              The volume card draws a distribution beside its total, and the only
              specialty distribution available is the one the page on screen
              carries — so it is drawn and labelled as the page's, while the total
              beside it says what the whole collection holds. Two facts about two
              different sets, and the caption is what tells them apart.
            */}
            <SpecialtyBars rows={specialtyBars(listings)} />
            <p className="mt-2 text-[0.6875rem] leading-tight text-faint">
              Spécialités de cette page
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}

/**
 * A mark per status, chosen from the icons this product already carries.
 *
 * The one thing `LISTING_STATUS_META` does not carry, because it is a React
 * component and that table is imported by the server as well. Keyed by status
 * and *total* rather than defaulted, so a status the table gains without a mark
 * here is a compile error rather than a clock.
 *
 * Exported for `my-listings-rail.spec.ts`, which holds the two tables against
 * each other: the type above makes a missing mark a compile error, but only as
 * long as nobody widens it to a `Partial` one day, and the test is what still
 * notices when they do.
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
  // « stopped », and the fallback MapLibre would have drawn anyway.
  CLOSED: ClockIcon,
  CLOSED_NO_CANDIDATE: ClockIcon,
  CANCELLED: ClockIcon,
};

/**
 * Every status with something in it, as a bar per row.
 *
 * Whole-collection figures, so this is the one panel on the rail that says the
 * same thing whatever page the reader is on. Empty statuses are dropped rather
 * than drawn at zero: a hairline row under every other one adds lines of noise
 * to say the collection has no cancelled posting.
 */
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
          /*
            The mark that opens each row, the reference's own arrangement: a
            glyph per category is what lets a reader match a bar here to a row in
            the table under it, where the same status pill appears.
          */
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

/**
 * A mark per status, chosen from the icons this product already carries.
 *
 * Decorative either way — the label sits beside it on the same row, and the pill
 * in the table says the same thing in colour.
 */
function StatusMark({ status }: { status: keyof typeof LISTING_STATUS_META }) {
  const Mark = STATUS_MARKS[status];
  return <Mark className="size-4 shrink-0 text-muted" />;
}

/**
 * The specialties on screen, ranked, ready for the bars.
 *
 * Ranked rather than in API order: the bars are a ranking (the tallest is cream),
 * and a chart whose tallest bar sits in the middle of the column reads as noise
 * rather than as a leader.
 */
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

/** How many bars the panel draws before folding the rest into the tooltips. */
const MAX_SPECIALTY_BARS = 6;
