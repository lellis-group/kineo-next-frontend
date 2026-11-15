import { Avatar } from "@/components/atoms/avatar";
import { Card } from "@/components/atoms/card";
import { StarIcon } from "@/components/atoms/icons";
import { MarketingHeading } from "@/components/atoms/marketing-heading";
import { Reveal } from "@/components/atoms/reveal";
import { MARKETING_SECTION, SITE_SHELL } from "@/lib/layout";
import { testimonialsSection } from "@/lib/marketing";

export function TestimonialsSection() {
  return (
    <section className="border-b border-border">
      <div className={`${SITE_SHELL} ${MARKETING_SECTION}`}>
        <MarketingHeading
          eyebrow={testimonialsSection.eyebrow}
          title={testimonialsSection.title}
          aside={
            <p className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted">
              <StarIcon className="size-4 text-primary" />
              <strong className="font-medium text-foreground tabular-nums">
                {testimonialsSection.rating}
              </strong>
              {testimonialsSection.ratingLabel}
            </p>
          }
        />

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {testimonialsSection.testimonials.map((testimonial, index) => (
            <Reveal
              key={testimonial.name}
              delay={index * 90}
              className="h-full"
            >
              <Card className="card-lift h-full shadow-[var(--shadow-card)]">
                <figure className="flex h-full flex-col p-6">
                  <span
                    aria-hidden="true"
                    className="text-5xl leading-none font-medium text-primary/40"
                  >
                    &ldquo;
                  </span>
                  <blockquote className="mt-2 flex-1 text-base leading-relaxed text-foreground/90">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                    <Avatar
                      name={testimonial.name}
                      className="size-9 text-xs"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {testimonial.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {testimonial.role}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
