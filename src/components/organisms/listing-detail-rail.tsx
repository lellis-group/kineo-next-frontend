import type { ComponentType, SVGProps } from "react";
import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  StarIcon,
  UndoIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { CapacityBar } from "@/components/molecules/capacity-bar";
import { ListingPeriodCell } from "@/components/molecules/listing-table-cells";
import { Panel } from "@/components/molecules/panel";
import { StatChip } from "@/components/molecules/panel-chrome";
import { RailDistribution } from "@/components/molecules/rail-distribution";
import { RailEmpty } from "@/components/molecules/rail-empty";
import { RailGauge } from "@/components/molecules/rail-gauge";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { ListingActions } from "@/components/organisms/listing-actions";
import { formatDateTime } from "@/lib/format";
import {
  adaptListingDetailRail,
  formatListingAge,
  type ListingApplicationsData,
  type MyListing,
  RECRUITING_STATUSES,
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
 * stand, the posting itself, and the way to take it down.
 */
export function ListingDetailRail({
  listing,
  counts,
  acting,
  onClose,
  onCancel,
}: {
  listing: MyListing;
  counts: ListingApplicationsData["counts"];
  acting?: boolean;
  onClose: () => void;
  onCancel: () => void;
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
        <dl className="cell-scope flex flex-col gap-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted">Période</dt>
            <dd>
              <ListingPeriodCell
                dateRange={listing.dateRange}
                startDate={listing.startDate}
                endDate={listing.endDate}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">Spécialité</dt>
            <dd className="flex items-center gap-2 text-foreground">
              <SpecialtyIcon
                specialty={listing.specialty}
                className="size-4 text-muted"
              />
              {specialtyLabel(listing.specialty)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-muted">
              <UsersIcon className="size-4" />
              Candidats actifs
            </dt>
            <dd>
              <CapacityBar
                count={listing.applicationsCount}
                max={listing.maxApplications}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">Diffusion</dt>
            <dd className="text-foreground">{formatListingAge(listing)}</dd>
          </div>
        </dl>

        {listing.description && (
          <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed whitespace-pre-line text-muted">
            {listing.description}
          </p>
        )}

        {listing.updatedAt && listing.updatedAt !== listing.createdAt && (
          <p className="mt-4 text-2xs text-faint">
            Modifiée le {formatDateTime(listing.updatedAt)}
          </p>
        )}
      </Panel>

      {RECRUITING_STATUSES.has(listing.status) && (
        <Panel title="Retirer de la diffusion">
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Les deux actions terminent les candidatures en cours et ne sont pas
            réversibles.
          </p>
          <ListingActions
            activeCount={listing.applicationsCount}
            acting={acting}
            onClose={onClose}
            onCancel={onCancel}
          />
        </Panel>
      )}
    </div>
  );
}
