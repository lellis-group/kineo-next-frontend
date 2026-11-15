import { CheckIcon, PencilIcon, UsersIcon } from "@/components/atoms/icons";
import { MarketingHeading } from "@/components/atoms/marketing-heading";
import { Reveal } from "@/components/atoms/reveal";
import { Panel } from "@/components/molecules/panel";
import { PanelExpand } from "@/components/molecules/panel-chrome";
import { cn } from "@/lib/cn";
import { MARKETING_SECTION, SITE_SHELL } from "@/lib/layout";
import { howItWorks } from "@/lib/marketing";

const STEP_ICONS = {
  pencil: PencilIcon,
  users: UsersIcon,
  check: CheckIcon,
} as const;

/** Shared by the header row and the step rows, so the columns line up. */
const ROW_GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 px-5 sm:grid-cols-[3rem_minmax(0,1fr)_8rem_7rem] sm:px-6";

/**
 * The `#how-it-works` anchor of the public nav, drawn as a board table: one
 * row per step, joined by the route line the console uses for a journey.
 */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-border">
      <div className={`${SITE_SHELL} ${MARKETING_SECTION}`}>
        <MarketingHeading
          eyebrow={howItWorks.eyebrow}
          title={howItWorks.title}
          subtitle={howItWorks.subtitle}
        />

        <Reveal className="mt-12">
          <Panel
            title="Du besoin au remplacement"
            action={<PanelExpand />}
            flush
          >
            <div
              className={cn(
                ROW_GRID,
                "border-y border-border bg-surface-2 py-2.5 text-xs text-muted",
              )}
            >
              <span>Étape</span>
              <span>Action</span>
              <span className="hidden sm:block">Qui</span>
              <span className="hidden text-right sm:block">Durée</span>
            </div>

            <ol>
              {howItWorks.steps.map((step, index) => {
                const Icon = STEP_ICONS[step.icon];
                const isFirst = index === 0;
                const isLast = index === howItWorks.steps.length - 1;
                return (
                  <li
                    key={step.title}
                    className={cn(
                      ROW_GRID,
                      "items-center border-b border-border py-5 transition-colors last:border-b-0 hover:bg-surface-hover sm:py-6",
                    )}
                  >
                    {/* The route: a ring at the start, a filled dot at the end. */}
                    <span
                      aria-hidden="true"
                      className="relative flex h-full flex-col items-center justify-center self-stretch"
                    >
                      <span
                        className={cn(
                          "absolute left-1/2 w-px -translate-x-1/2 bg-border-strong",
                          isFirst ? "top-1/2" : "-top-6",
                          isLast ? "bottom-1/2" : "-bottom-6",
                        )}
                      />
                      <span
                        className={cn(
                          "relative grid size-9 place-items-center rounded-full text-primary",
                          isLast
                            ? "bg-primary text-primary-foreground"
                            : "border border-border-strong bg-surface",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs text-muted tabular-nums">
                        #{String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-0.5 text-base font-medium sm:text-lg">
                        {step.title}
                      </h3>
                      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                        {step.description}
                      </p>
                      <p className="mt-2 text-xs text-muted sm:hidden">
                        {step.actor} · {step.duration}
                      </p>
                    </div>

                    <span className="hidden text-sm text-foreground sm:block">
                      {step.actor}
                    </span>
                    <span className="hidden text-right text-sm text-foreground tabular-nums sm:block">
                      {step.duration}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </Reveal>
      </div>
    </section>
  );
}
