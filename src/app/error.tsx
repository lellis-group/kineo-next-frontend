"use client";

import { Button } from "@/components/atoms/button";
import { ArrowLeftIcon } from "@/components/atoms/icons";
import { AuthCard } from "@/components/organisms/auth-card";

/** Outside the `(site)` chrome, so it takes the auth screens' card and logo. */
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthCard
      title="Une erreur est survenue"
      subtitle="Quelque chose s’est mal passé. Réessayez dans un instant."
    >
      <Button size="lg" onClick={reset} className="w-full">
        Réessayer
      </Button>
      <div className="mt-4 text-center">
        <Button href="/" variant="ghost">
          <ArrowLeftIcon className="h-4 w-4" />
          Accueil
        </Button>
      </div>
    </AuthCard>
  );
}
