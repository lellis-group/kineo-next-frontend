import type { ReactNode } from "react";
import { Badge } from "@/components/atoms/badge";
import {
  CalendarIcon,
  ClockIcon,
  LayersIcon,
  MapPinIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { BackLink } from "@/components/molecules/back-link";
import { CapacityBar } from "@/components/molecules/capacity-bar";
import { FactRow } from "@/components/molecules/fact-row";
import { MapPaper, type MapPaperPin } from "@/components/molecules/map-paper";
import { Panel } from "@/components/molecules/panel";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import { formatDayMonth, formatDurationDays } from "@/lib/format";
import { BOARD_SHELL } from "@/lib/layout";
import {
  type BrowseListingDetail,
  formatListingAge,
  LISTING_STATUS_META,
  specialtyLabel,
} from "@/lib/listings";

/** The posting's pin: the paper is a still, so the spot is symbolic. */
const PIN: readonly MapPaperPin[] = [{ x: 46, y: 50, active: true }];

/**
 * One posting as the replacement doctor reads it, on the console board: the
 * facts and the place down the rail, the way to apply and the description
 * beside them. `apply` is the server page's: who may apply is decided there.
 */
export function BrowseListingDetailView({
  listing,
  apply,
}: {
  listing: BrowseListingDetail;
  /** The apply panel matched to the reader; it renders nothing for a practice. */
  apply: ReactNode;
}) {
  const status = LISTING_STATUS_META[listing.status];
  const place = [listing.practiceName, listing.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={BOARD_SHELL}>
      <header className="flex flex-col gap-3 pt-2">
        <BackLink href="/listings">Annonces</BackLink>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="min-w-0 text-2xl leading-tight font-medium tracking-tight break-words sm:text-3xl">
            {listing.title}
          </h1>
          <div className="flex items-center gap-2">
            {listing.urgent && (
              <Badge tone="danger" size="md">
                Urgent
              </Badge>
            )}
            <Badge tone={status.tone} size="md">
              {status.label}
            </Badge>
          </div>
        </div>
        {place && <p className="text-sm text-muted">{place}</p>}
      </header>

      <div className="grid items-start gap-3 lg:grid-cols-[22.5rem_minmax(0,1fr)]">
        <div className="order-2 flex flex-col gap-3 lg:order-1">
          <Panel title="Annonce">
            <dl className="cell-scope divide-y divide-border">
              <FactRow mark={<LayersIcon />} label="Cabinet">
                {listing.practiceName}
              </FactRow>
              <FactRow mark={<MapPinIcon />} label="Lieu">
                {listing.city || "—"}
              </FactRow>
              <FactRow
                mark={<SpecialtyIcon specialty={listing.specialty} />}
                label="Spécialité"
              >
                {specialtyLabel(listing.specialty)}
              </FactRow>
              <FactRow mark={<CalendarIcon />} label="Période">
                <span className="block whitespace-nowrap">
                  {formatDayMonth(listing.startDate)} →{" "}
                  {formatDayMonth(listing.endDate)}
                </span>
                <span className="block text-xs font-normal text-muted">
                  {formatDurationDays(listing.startDate, listing.endDate)}
                </span>
              </FactRow>
              <FactRow mark={<UsersIcon />} label="Candidats">
                <CapacityBar
                  count={listing.applicationsCount}
                  max={listing.maxApplications}
                />
              </FactRow>
              <FactRow mark={<ClockIcon />} label="Publication">
                {formatListingAge(listing)}
              </FactRow>
            </dl>
          </Panel>

          {listing.city && (
            <Panel title="Lieu" flush>
              <div className="px-2 pb-2">
                <MapPaper pins={PIN} className="h-44">
                  <span className="absolute top-1/2 left-[46%] ml-5 -translate-y-1/2 rounded-control bg-map-card px-3 py-2 shadow-[0_4px_16px_rgb(22_21_15/0.2)]">
                    <span className="block text-xs font-medium whitespace-nowrap text-map-ink">
                      {listing.city}
                    </span>
                    <span className="block text-[0.625rem] whitespace-nowrap text-map-muted">
                      {listing.practiceName}
                    </span>
                  </span>
                </MapPaper>
              </div>
            </Panel>
          )}
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
          {apply}

          <Panel title="Description">
            {listing.description ? (
              <p className="max-w-3xl text-sm leading-relaxed whitespace-pre-line text-foreground/85">
                {listing.description}
              </p>
            ) : (
              <p className="text-sm text-muted">
                Le cabinet n&apos;a pas ajouté de description.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
