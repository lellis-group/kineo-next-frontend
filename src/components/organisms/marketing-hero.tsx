import type { CSSProperties } from "react";
import { Button } from "@/components/atoms/button";
import {
  ArrowRightIcon,
  CalendarIcon,
  PercentIcon,
  ShieldIcon,
} from "@/components/atoms/icons";
import { TrustBadge } from "@/components/molecules/trust-badge";
import { ConsolePreview } from "@/components/organisms/console-preview";
import { SITE_SHELL } from "@/lib/layout";
import { hero, trustBar } from "@/lib/marketing";

const TRUST_ICONS = {
  shield: ShieldIcon,
  calendar: CalendarIcon,
  percent: PercentIcon,
} as const;

const heroDelay = (ms: number) =>
  ({
    "--hero-delay": `${ms}ms`,
  }) as CSSProperties;

/**
 * The landing's opening: the pitch on the left, a still of the console on the
 * right, on the header's own geometry so the two line up.
 */
export function MarketingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* A faint cream wash behind the console, so the frame doesn't float on flat black. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] size-[44rem] rounded-full bg-primary/[0.07] blur-3xl"
      />

      <div
        className={`${SITE_SHELL} relative grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-12 xl:gap-16 lg:pt-20 lg:pb-24`}
      >
        <div className="min-w-0">
          <p
            className="hero-enter inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-muted"
            style={heroDelay(0)}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-success"
            />
            {trustBar.eyebrow}
          </p>

          <h1
            className="hero-enter mt-6 text-[2.6rem] leading-[1.04] font-medium tracking-tight text-balance sm:text-6xl lg:text-[3.6rem] 2xl:text-7xl"
            style={heroDelay(40)}
          >
            {hero.title}{" "}
            <span className="text-primary">{hero.titleAccent}</span>
          </h1>

          <p
            className="hero-enter mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
            style={heroDelay(80)}
          >
            {hero.subtitle}
          </p>

          <div
            className="hero-enter mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={heroDelay(120)}
          >
            <Button
              href={hero.primaryCta.href}
              size="lg"
              className="btn-shine w-full sm:w-auto"
            >
              {hero.primaryCta.label}
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              href={hero.secondaryCta.href}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              {hero.secondaryCta.label}
            </Button>
          </div>

          <ul
            className="hero-enter mt-10 flex flex-wrap gap-2.5"
            style={heroDelay(180)}
          >
            {trustBar.items.map((item) => (
              <li key={item.label}>
                <TrustBadge icon={TRUST_ICONS[item.icon]} label={item.label} />
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-enter min-w-0" style={heroDelay(240)}>
          <ConsolePreview />
        </div>
      </div>
    </section>
  );
}
