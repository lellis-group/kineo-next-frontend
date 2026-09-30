import { CheckIcon, PencilIcon, UsersIcon } from "@/components/atoms/icons";
import { Reveal } from "@/components/atoms/reveal";
import { SectionHeading } from "@/components/atoms/section-heading";
import { MARKETING_CONTAINER } from "@/lib/layout";
import { howItWorks } from "@/lib/marketing";

const STEP_ICONS = {
  pencil: PencilIcon,
  users: UsersIcon,
  check: CheckIcon,
} as const;

/**
 * The `#how-it-works` anchor the public nav scrolls to — without this section on
 * the page, that link had no target.
 */
export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-border bg-background"
    >
      <div className={MARKETING_CONTAINER}>
        <SectionHeading
          title={howItWorks.title}
          subtitle={howItWorks.subtitle}
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*:last-child:nth-child(2n+1)]:sm:col-span-2 [&>*:last-child:nth-child(2n+1)]:lg:col-span-1">
          {howItWorks.steps.map((step, index) => {
            const Icon = STEP_ICONS[step.icon];
            return (
              <Reveal
                key={step.title}
                delay={index * 90}
                className="card-lift h-full rounded-2xl border border-border bg-surface p-6"
              >
                <div className="mb-5 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="icon-tilt flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"
                  >
                    <Icon />
                  </span>
                  <span className="text-xs font-bold tracking-widest text-muted uppercase">
                    Étape {index + 1}
                  </span>
                </div>
                <h3 className="mb-2 font-bold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
