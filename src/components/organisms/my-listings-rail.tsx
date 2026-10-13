import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { ProgressCurve } from "@/components/atoms/progress-curve";
import { SegmentedBar } from "@/components/atoms/segmented-bar";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand, StatChip } from "@/components/molecules/panel-chrome";
import {
  type BarRow,
  SpecialtyBars,
} from "@/components/molecules/specialty-bars";
import { plural } from "@/lib/format";
import {
  countRecruitingListings,
  LISTING_STATUS_META,
  type ListingStatusCounts,
  type MyListing,
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

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Recrutement" action={<PanelExpand />}>
        <div className="grid grid-cols-2 gap-2">
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
        </div>

        {/*
          The arc is this page's share of listings still recruiting — the same
          gauge the browse screen's urgent panel draws, and it earns its place for
          the same reason: the number a practice wants is not how many postings
          they own but how much of what they are looking at is still live.
        */}
        <div className="mt-5">
          <ProgressCurve
            percent={recruitingPercent}
            caption={`${recruiting} annonce${plural(
              recruiting,
            )} en cours sur ${listings.length} (cette page)`}
          />
        </div>
      </Panel>

      <Panel title="Répartition par statut" action={<PanelExpand />}>
        <StatusDistribution counts={counts} />
      </Panel>

      <Panel title="Volume publié" action={<PanelExpand />}>
        {counts.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucune annonce publiée.
          </p>
        ) : (
          <>
            <dl className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-2.5">
                <div>
                  <dt className="text-[0.6875rem] leading-tight text-muted">
                    En cours
                  </dt>
                  <dd className="text-lg leading-tight font-medium text-foreground tabular-nums">
                    {recruitingStates.reduce(
                      (sum, status) => sum + (counts[status] ?? 0),
                      0,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.6875rem] leading-tight text-muted">
                    Autres
                  </dt>
                  <dd className="text-lg leading-tight font-medium text-foreground tabular-nums">
                    {counts.total -
                      recruitingStates.reduce(
                        (sum, status) => sum + (counts[status] ?? 0),
                        0,
                      )}
                  </dd>
                </div>
              </div>

              <div className="text-center">
                <dd className="text-4xl leading-none font-medium text-foreground tabular-nums">
                  {counts.total}
                </dd>
                <dt className="mt-1.5 text-[0.6875rem] leading-tight text-muted">
                  annonces publiées
                </dt>
              </div>

              <span className="badge badge-info shrink-0 self-end">
                {filledPercent} % pourvues
              </span>
            </dl>

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

/** The statuses that count as « still looking » — the board's own vocabulary. */
const recruitingStates = ["OPEN", "IN_DISCUSSION", "FULL"] as const;

/**
 * The name each status takes in a fixed-width column.
 *
 * A second table rather than a truncation of `LISTING_STATUS_META`'s labels:
 * « Candidatures en cours » and « Clôturée sans remplaçant » are both wider than
 * the column, and a label cut mid-word is worse than a terse one — the reader
 * cannot tell which bar is theirs, and this column is one of scan-and-match, not
 * one of reading. The full name is the row's `title`.
 */
const STATUS_SHORT_LABELS: Record<keyof typeof LISTING_STATUS_META, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouverte",
  IN_DISCUSSION: "En discussion",
  FULL: "Complet",
  FILLED: "Pourvue",
  CLOSED: "Clôturée",
  CLOSED_NO_CANDIDATE: "Sans remp.",
  CANCELLED: "Annulée",
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
    return (
      <p className="py-6 text-center text-sm text-muted">
        Aucune annonce à répartir.
      </p>
    );
  }

  const percent = (count: number) =>
    Math.round((count / (counts.total || 1)) * 100);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.status} className="flex min-w-0 items-center gap-2">
          {/*
            The mark that opens each row, the reference's own arrangement: a
            glyph per category is what lets a reader match a bar here to a row in
            the table under it, where the same status pill appears.
          */}
          <StatusMark status={row.status} />
          <span
            className="w-[6.5rem] shrink-0 truncate text-sm text-foreground"
            title={LISTING_STATUS_META[row.status].label}
          >
            {STATUS_SHORT_LABELS[row.status]}
          </span>
          <span className="w-5 shrink-0 text-right text-sm font-medium text-foreground tabular-nums">
            {row.count}
          </span>
          <SegmentedBar percent={percent(row.count)} className="min-w-0" />
          <span className="w-9 shrink-0 text-right text-xs text-muted tabular-nums">
            {percent(row.count)} %
          </span>
        </li>
      ))}
    </ul>
  );
}
/** Statuses in the order a listing moves through them. */
const LISTING_STATUS_ORDER = [
  "DRAFT",
  "OPEN",
  "IN_DISCUSSION",
  "FULL",
  "FILLED",
  "CLOSED",
  "CLOSED_NO_CANDIDATE",
  "CANCELLED",
] as const;

/**
 * A mark per status, chosen from the icons this product already carries.
 *
 * Not an `STATUS_ICONS` table written for five more glyphs: the set already
 * covers « not published », « live », « in discussion », « full », « done » and
 * « stopped ». Decorative either way — the label sits beside it on the same row,
 * and the pill in the table says the same thing in colour.
 */
function StatusMark({ status }: { status: keyof typeof LISTING_STATUS_META }) {
  const shared = "size-4 shrink-0 text-muted";
  switch (status) {
    case "DRAFT":
      return <LayersIcon className={shared} />;
    case "OPEN":
      return <ActivityIcon className={shared} />;
    case "IN_DISCUSSION":
      return <FileTextIcon className={shared} />;
    case "FULL":
      return <UsersIcon className={shared} />;
    case "FILLED":
      return <CheckIcon className={shared} />;
    default:
      return <ClockIcon className={shared} />;
  }
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
