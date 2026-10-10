import { FeaturesSection } from "@/components/organisms/features-section";
import { HowItWorksSection } from "@/components/organisms/how-it-works-section";
import { JoinCta } from "@/components/organisms/join-cta";
import { MarketingHero } from "@/components/organisms/marketing-hero";
import { TestimonialsSection } from "@/components/organisms/testimonials-section";

/**
 * Public page content (unauthenticated visitor). Shell provided by the (site) layout.
 * Conversion flow (matches the landing mockup): hero → features → how it works →
 * testimonials → action. The section order is what the public nav's in-page
 * anchors walk through, so each `id` here has to stay reachable.
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
