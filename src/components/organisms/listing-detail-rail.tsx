import type { ComponentType, SVGProps } from "react";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  StarIcon,
  UndoIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { CapacityBar } from "@/components/molecules/capacity-bar";
import { FactRow } from "@/components/molecules/fact-row";
import { Panel } from "@/components/molecules/panel";
import { StatChip } from "@/components/molecules/panel-chrome";
import { RailDistribution } from "@/components/molecules/rail-distribution";
import { RailEmpty } from "@/components/molecules/rail-empty";
import { RailGauge } from "@/components/molecules/rail-gauge";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import {
  formatDateTime,
  formatDayMonth,
  formatDurationDays,
} from "@/lib/format";
import {
  adaptListingDetailRail,
  formatListingAge,
  type ListingApplicationsData,
  type MyListing,
  specialtyLabel,
} from "@/lib/listings";
import type { ApplicationStatus } from "@/lib/types/api";

const STATUS_MARKS: Record<
  ApplicationStatus,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  PENDING: ClockIcon,
  SHORTLISTED: StarIcon,
  ACCEPTED: CheckIcon,
  REJECTED: AlertTriangleIcon,
  WITHDRAWN: UndoIcon,
};

/**
 * The left of a listing's page: how recruiting goes, where the candidates
 * stand, and the posting itself.
 */
export function ListingDetailRail({
  listing,
  counts,
}: {
  listing: MyListing;
  counts: ListingApplicationsData["counts"];
}) {
  const rail = adaptListingDetailRail(listing, counts);

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Recrutement">
        <RailGauge percent={rail.gauge.percent} caption={rail.gauge.caption}>
          <StatChip
            icon={<FileTextIcon className="size-3.5" />}
            label="Reçues"
            value={String(rail.received)}
          />
          <StatChip
            icon={<ClockIcon className="size-3.5" />}
            label="En attente"
            value={String(rail.pending)}
          />
          <StatChip
            icon={<StarIcon className="size-3.5" />}
            label="Présélectionnés"
            value={String(rail.shortlisted)}
          />
          <StatChip
            icon={<CheckIcon className="size-3.5" />}
            label="Acceptés"
            value={String(rail.accepted)}
          />
        </RailGauge>
      </Panel>

      <Panel title="Candidats par statut">
        {rail.rows.length === 0 ? (
          <RailEmpty>Aucune candidature reçue.</RailEmpty>
        ) : (
          <RailDistribution
            rows={rail.rows.map((row) => {
              const Mark = STATUS_MARKS[row.status];
              return {
                key: row.status,
                mark: <Mark className="size-4 shrink-0 text-muted" />,
                label: row.label,
                title: row.label,
                count: row.count,
                percent: row.percent,
              };
            })}
          />
        )}
      </Panel>

      <Panel title="Annonce">
        <dl className="cell-scope divide-y divide-border">
          <FactRow mark={<CalendarIcon />} label="Période">
            <span className="block whitespace-nowrap">
              {formatDayMonth(listing.startDate)} →{" "}
              {formatDayMonth(listing.endDate)}
            </span>
            <span className="block text-xs font-normal text-muted">
              {formatDurationDays(listing.startDate, listing.endDate)}
            </span>
          </FactRow>
          <FactRow
            mark={<SpecialtyIcon specialty={listing.specialty} />}
            label="Spécialité"
          >
            {specialtyLabel(listing.specialty)}
          </FactRow>
          <FactRow mark={<UsersIcon />} label="Candidats actifs">
            <CapacityBar
              count={listing.applicationsCount}
              max={listing.maxApplications}
            />
          </FactRow>
          <FactRow mark={<ClockIcon />} label="Diffusion">
            {formatListingAge(listing)}
          </FactRow>
        </dl>

        {listing.description && (
          <div className="mt-4 rounded-control bg-white/[0.04] px-4 py-3">
            <p className="text-2xs text-muted">Description</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground/85">
              {listing.description}
            </p>
          </div>
        )}

        {listing.updatedAt && listing.updatedAt !== listing.createdAt && (
          <p className="mt-3 text-2xs text-faint">
            Modifiée le {formatDateTime(listing.updatedAt)}
          </p>
        )}
      </Panel>
    </div>
  );
}
