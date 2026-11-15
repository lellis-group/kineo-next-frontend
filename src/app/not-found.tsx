import { Button } from "@/components/atoms/button";
import { AuthCard } from "@/components/organisms/auth-card";

export async function generateMetadata() {
  return {
    title: "404 — Page introuvable | Kineo",
    description: "Cette page n'existe pas ou a été déplacée.",
  };
}

/** Outside the `(site)` chrome, so it takes the auth screens' card and logo. */
export default function NotFound() {
  return (
    <AuthCard
      title="Page introuvable"
      subtitle="Erreur 404 · cette page n’existe pas ou a été déplacée."
    >
      <Button href="/" size="lg" className="w-full">
        Retour à l’accueil
      </Button>
    </AuthCard>
  );
}
