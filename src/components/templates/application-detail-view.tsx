import { Badge } from "@/components/atoms/badge";
import { Card } from "@/components/atoms/card";
import {
  CalendarIcon,
  LayersIcon,
  MapPinIcon,
  PercentIcon,
} from "@/components/atoms/icons";
import { ApplicationMessage } from "@/components/molecules/application-message";
import { ApplicationStatusBanner } from "@/components/molecules/application-status-banner";
import { ApplicationWithdraw } from "@/components/molecules/application-withdraw";
import { BackLink } from "@/components/molecules/back-link";
import { FactRow } from "@/components/molecules/fact-row";
import { Panel } from "@/components/molecules/panel";
import { ProgressTrack } from "@/components/molecules/progress-track";
import { SpecialtyIcon } from "@/components/molecules/specialty-icon";
import {
  type ApplicationEntry,
  applicationProgress,
  applicationStatus,
  practiceLabel,
  WITHDRAWABLE_STATUSES,
} from "@/lib/applications";
import { formatDayMonth, formatDurationDays } from "@/lib/format";
import { BOARD_SHELL } from "@/lib/layout";
import { specialtyLabel } from "@/lib/listings";

/**
 * One application, on the console board: its journey on top — the track the
 * list draws, here with its labels and dates — the posting down the rail,
 * the message and the withdrawal beside it.
 */
export function ApplicationDetailView({
  application,
  onSaveMessage,
  onWithdraw,
}: {
  application: ApplicationEntry;
  onSaveMessage: (message: string) => Promise<void>;
  onWithdraw: (reason: string) => Promise<void>;
}) {
  const { listing } = application;
  const status = applicationStatus(application);
  const practice = practiceLabel(listing);
  const canWithdraw = WITHDRAWABLE_STATUSES.has(application.status);

  return (
    <div className={BOARD_SHELL}>
      <header className="flex flex-col gap-3 pt-2">
        <BackLink href="/applications">Mes candidatures</BackLink>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="min-w-0 text-2xl leading-tight font-medium tracking-tight break-words sm:text-3xl">
            {listing.title}
          </h1>
          <Badge tone={status.tone} size="md">
            {status.label}
          </Badge>
        </div>
        {practice && <p className="text-sm text-muted">{practice}</p>}
      </header>

      <Panel title="Suivi">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-10">
          <ProgressTrack steps={applicationProgress(application)} />
          <ApplicationStatusBanner application={application} />
        </div>
      </Panel>

      <div className="grid items-start gap-3 lg:grid-cols-[22.5rem_minmax(0,1fr)]">
        <Panel title="Annonce" className="order-2 lg:order-1">
          <dl className="divide-y divide-border">
            {listing.practiceName && (
              <FactRow mark={<LayersIcon />} label="Cabinet">
                {listing.practiceName}
              </FactRow>
            )}
            {listing.practiceCity && (
              <FactRow mark={<MapPinIcon />} label="Lieu">
                {listing.practiceCity}
              </FactRow>
            )}
            {listing.specialty && (
              <FactRow
                mark={<SpecialtyIcon specialty={listing.specialty} />}
                label="Spécialité"
              >
                {specialtyLabel(listing.specialty)}
              </FactRow>
            )}
            <FactRow mark={<CalendarIcon />} label="Période">
              {listing.startDate && listing.endDate ? (
                <>
                  <span className="block whitespace-nowrap">
                    {formatDayMonth(listing.startDate)} →{" "}
                    {formatDayMonth(listing.endDate)}
                  </span>
                  <span className="block text-xs font-normal text-muted">
                    {formatDurationDays(listing.startDate, listing.endDate)}
                  </span>
                </>
              ) : (
                <span className="font-normal text-muted">Non communiquée</span>
              )}
            </FactRow>
            <FactRow mark={<PercentIcon />} label="Rémunération">
              {listing.remuneration ?? (
                <span className="font-normal text-muted">Non précisée</span>
              )}
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
        </Panel>

        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
          <Card className="px-5 py-5 shadow-[var(--shadow-card)] sm:px-6">
            <ApplicationMessage
              message={application.message}
              canEdit={application.status === "PENDING"}
              onSaveMessage={onSaveMessage}
            />
          </Card>

          {canWithdraw && <ApplicationWithdraw onWithdraw={onWithdraw} />}
        </div>
      </div>
    </div>
  );
}
