import type { CSSProperties } from "react";
import { Button } from "@/components/atoms/button";
import {
  CalendarIcon,
  PercentIcon,
  ShieldIcon,
} from "@/components/atoms/icons";
import { TrustBadge } from "@/components/molecules/trust-badge";
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

export function MarketingHero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:gap-14 lg:pt-20">
        <div className="min-w-0 text-center lg:text-left">
          <h1
            className="hero-enter text-[2.5rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            style={heroDelay(0)}
          >
            {hero.title}{" "}
            <span className="text-primary">{hero.titleAccent}</span>
          </h1>

          <p
            className="hero-enter mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:mx-0"
            style={heroDelay(60)}
          >
            {hero.subtitle}
          </p>

          <div
            className="hero-enter mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center lg:justify-start"
            style={heroDelay(120)}
          >
            <Button
              href={hero.primaryCta.href}
              size="lg"
              className="btn-shine w-full sm:w-auto"
            >
              {hero.primaryCta.label}
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
        </div>

        <div className="hero-enter min-w-0" style={heroDelay(240)}>
          <div
            aria-hidden="true"
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
          >
            <div className="flex items-center justify-between px-1 pt-1 pb-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted/20" />
              </span>
              <span className="font-mono text-[11px] tracking-wide text-muted">
                {hero.livePreview.caption}
              </span>
            </div>
            <div className="rounded-xl bg-background p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-foreground">
                  {hero.livePreview.contractTitle}
                </p>
                <span className="shrink-0 text-xs font-medium text-success">
                  {hero.livePreview.contractStatus}
                </span>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <p className="truncate text-[13px] text-muted">
                  {hero.livePreview.cabinet}
                </p>
                <p className="mt-1.5 truncate text-[13px] text-muted">
                  {hero.livePreview.period}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-14 sm:px-6 sm:pb-16 lg:pb-20">
        <p
          className="hero-enter mb-5 text-xs font-bold tracking-widest text-muted uppercase"
          style={heroDelay(280)}
        >
          {trustBar.eyebrow}
        </p>
        <div className="hero-enter flex flex-wrap gap-3" style={heroDelay(340)}>
          {trustBar.items.map((item) => (
            <TrustBadge
              key={item.label}
              icon={TRUST_ICONS[item.icon]}
              label={item.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
