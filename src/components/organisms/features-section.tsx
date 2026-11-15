import type { ComponentType, ReactNode, SVGProps } from "react";
import { Avatar } from "@/components/atoms/avatar";
import { Badge } from "@/components/atoms/badge";
import {
  MapPinIcon,
  PencilIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/atoms/icons";
import { MarketingHeading } from "@/components/atoms/marketing-heading";
import { Reveal } from "@/components/atoms/reveal";
import { SegmentedBar } from "@/components/atoms/segmented-bar";
import { MapPaper, type MapPaperPin } from "@/components/molecules/map-paper";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand } from "@/components/molecules/panel-chrome";
import { VerifiedBadge } from "@/components/molecules/verified-badge";
import { MARKETING_SECTION, SITE_SHELL, SOFT_PANEL } from "@/lib/layout";
import {
  type FeatureItem,
  featurePreviews,
  featuresSection,
} from "@/lib/marketing";

const FEATURE_ICONS: Record<
  FeatureItem["icon"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  pencil: PencilIcon,
  users: UsersIcon,
  mapPin: MapPinIcon,
};

/** Each feature's still, in the order of `featuresSection.features`. */
const FEATURE_PREVIEWS: Record<FeatureItem["icon"], () => ReactNode> = {
  pencil: PublishPreview,
  users: CandidatesPreview,
  mapPin: MapPreview,
};

const MAP_PINS: readonly MapPaperPin[] = [
  { x: 22, y: 34 },
  { x: 40, y: 64 },
  { x: 55, y: 40, active: true },
  { x: 74, y: 26 },
  { x: 82, y: 66 },
];

/** The `#features` anchor of the public nav: three board panels, each with a still. */
export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-border">
      <div className={`${SITE_SHELL} ${MARKETING_SECTION}`}>
        <MarketingHeading
          title={featuresSection.title}
          subtitle={featuresSection.subtitle}
        />

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {featuresSection.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[feature.icon];
            const Preview = FEATURE_PREVIEWS[feature.icon];
            return (
              <Reveal key={feature.title} delay={index * 80} className="h-full">
                <Panel
                  className="card-lift flex h-full flex-col"
                  title={
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="icon-tilt grid size-8 place-items-center rounded-full bg-primary/10 text-primary"
                      >
                        <Icon className="size-4" />
                      </span>
                      {feature.title}
                    </span>
                  }
                  action={<PanelExpand />}
                >
                  <p className="text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                  <div aria-hidden="true" className="mt-5">
                    <Preview />
                  </div>
                </Panel>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PublishPreview() {
  const { fields, retrocession, submit } = featurePreviews.publish;
  return (
    <div className={`${SOFT_PANEL} space-y-2 p-3`}>
      {fields.map((field) => (
        <div
          key={field.label}
          className="flex items-center justify-between gap-3 rounded-control bg-surface-3 px-3 py-2.5"
        >
          <span className="text-2xs text-muted">{field.label}</span>
          <span className="truncate text-control text-foreground">
            {field.value}
          </span>
        </div>
      ))}
      <div className="rounded-control bg-surface-3 px-3 py-2.5">
        <div className="flex items-center justify-between text-2xs text-muted">
          {retrocession.label}
          <span className="text-control text-foreground tabular-nums">
            {retrocession.percent} %
          </span>
        </div>
        <SegmentedBar percent={retrocession.percent} className="mt-2" />
      </div>
      <div className="rounded-control bg-primary px-3 py-2.5 text-center text-control font-medium text-primary-foreground">
        {submit}
      </div>
    </div>
  );
}

function CandidatesPreview() {
  return (
    <ul className={`${SOFT_PANEL} divide-y divide-border`}>
      {featurePreviews.candidates.map((candidate) => (
        <li key={candidate.name} className="flex items-center gap-3 px-3 py-3">
          <Avatar name={candidate.name} className="size-8 text-xs" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-control font-medium text-foreground">
                {candidate.name}
              </span>
              <VerifiedBadge label="" className="shrink-0" />
            </span>
            <span className="block truncate text-2xs text-muted">
              {candidate.detail}
            </span>
          </span>
          <Badge tone={candidate.status.tone} variant="plain">
            {candidate.status.label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function MapPreview() {
  const { search, radius, results } = featurePreviews.map;
  return (
    <MapPaper pins={MAP_PINS} className="h-42">
      <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-map-card px-3 py-1.5 text-2xs font-medium text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.18)]">
        <SearchIcon className="size-3.5" />
        {search}
        <span className="text-map-faint">· {radius}</span>
      </span>
      <span className="absolute bottom-3 left-3 rounded-full bg-map-ink px-3 py-1.5 text-2xs font-medium text-map-base">
        {results}
      </span>
    </MapPaper>
  );
}
