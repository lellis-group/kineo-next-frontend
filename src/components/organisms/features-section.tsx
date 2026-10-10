import { MapPinIcon, PencilIcon, UsersIcon } from "@/components/atoms/icons";
import { Reveal } from "@/components/atoms/reveal";
import { FeatureCard } from "@/components/molecules/feature-card";
import { MARKETING_CONTAINER } from "@/lib/layout";
import { featuresSection } from "@/lib/marketing";

const FEATURE_ICONS = {
  pencil: PencilIcon,
  users: UsersIcon,
  mapPin: MapPinIcon,
} as const;

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-b border-border bg-background"
    >
      <div className={MARKETING_CONTAINER}>
        <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {featuresSection.title}
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featuresSection.features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80} className="h-full">
              <FeatureCard
                icon={FEATURE_ICONS[feature.icon]}
                title={feature.title}
                description={feature.description}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
