import { SignupEmailForm } from "@/components/molecules/signup-email-form";
import { MARKETING_SECTION, SITE_SHELL } from "@/lib/layout";
import { joinCta } from "@/lib/marketing";

/** The closing call: a cream-edged card holding the signup form. */
export function JoinCta() {
  return (
    <section>
      <div className={`${SITE_SHELL} ${MARKETING_SECTION}`}>
        <div className="relative overflow-hidden rounded-card border border-primary/25 bg-surface px-6 py-12 shadow-[var(--shadow-card)] sm:px-12 sm:py-16">
          {/* The rail's tick track, as a quiet texture along the bottom. */}
          <span
            aria-hidden="true"
            className="tick-track absolute inset-x-0 bottom-0 h-10 text-primary/[0.08]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-3xl leading-[1.1] font-medium tracking-tight text-balance sm:text-4xl">
                {joinCta.title}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
                {joinCta.subtitle}
              </p>
            </div>

            <div className="w-full max-w-md shrink-0">
              <SignupEmailForm
                placeholder={joinCta.emailPlaceholder}
                submitLabel={joinCta.submitLabel}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
