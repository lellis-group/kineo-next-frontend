import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";

/**
 * Onboarding banner when the user has no profile yet (GET /profile/me → 404,
 * documented by the API). Account is active, but business data is missing.
 *
 * Built on Card with `cn` (tailwind-merge): the primary tint reliably
 * overrides Card's default border/background.
 */
export function ProfileOnboardingCard() {
  return (
    <Card className="border-primary/30 bg-primary/5 p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-medium">
            Complétez votre profil professionnel
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Votre compte est actif, mais votre profil n&apos;est pas encore
            créé. Renseignez votre spécialité et votre type de pratique pour
            publier des annonces et candidater.
          </p>
        </div>

        <Button href="/profile" className="shrink-0">
          Compléter mon profil
        </Button>
      </div>
    </Card>
  );
}
