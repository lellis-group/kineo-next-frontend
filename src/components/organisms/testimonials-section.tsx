import { StarIcon } from "@/components/atoms/icons";
import { Reveal } from "@/components/atoms/reveal";
import { MARKETING_CONTAINER } from "@/lib/layout";
import { testimonialsSection } from "@/lib/marketing";

/**
 * Testimonials section — social proof carousel replacement in static grid:
 * section title + rating on the right, three quote cards (staggered on desktop).
 */
export function TestimonialsSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className={MARKETING_CONTAINER}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {testimonialsSection.title}
          </h2>
          <p className="flex shrink-0 items-center gap-1.5 text-sm text-muted">
            <StarIcon className="h-4 w-4 text-primary" />
            <strong className="font-bold text-foreground">
              {testimonialsSection.rating}
            </strong>
            {testimonialsSection.ratingLabel}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonialsSection.testimonials.map((testimonial, index) => (
            <Reveal
              key={testimonial.name}
              delay={index * 90}
              className={
                index === 1
                  ? "md:translate-y-4"
                  : index === 2
                    ? "md:translate-y-8"
                    : undefined
              }
            >
              <figure className="card-lift flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
                <blockquote className="flex-1 text-sm leading-relaxed text-muted">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5">
                  <p className="text-sm font-bold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {testimonial.role}
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
