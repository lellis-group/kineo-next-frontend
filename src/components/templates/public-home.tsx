import { FeaturesSection } from "@/components/organisms/features-section";
import { HowItWorksSection } from "@/components/organisms/how-it-works-section";
import { JoinCta } from "@/components/organisms/join-cta";
import { MarketingHero } from "@/components/organisms/marketing-hero";
import { TestimonialsSection } from "@/components/organisms/testimonials-section";

/**
 * The public landing page. Each section `id` is an in-page anchor of the
 * public nav.
 */
export function PublicHome() {
  return (
    <>
      <MarketingHero />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <JoinCta />
    </>
  );
}
