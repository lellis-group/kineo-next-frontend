import { SignupEmailForm } from "@/components/molecules/signup-email-form";
import { joinCta } from "@/lib/marketing";

export function JoinCta() {
  return (
    <section className="border-t border-primary/20 bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
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
    </section>
  );
}
