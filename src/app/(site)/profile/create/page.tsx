import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ProfileFormContainer } from "@/components/templates/profile-form-container";
import { passProfileGate } from "@/lib/profile-gate";

export const metadata: Metadata = {
  title: "Créer le profil — Kineo",
  description:
    "Créez votre profil professionnel Kineo : spécialité, type de pratique, numéro RPPS et visibilité.",
  robots: { index: false },
};

/**
 * Static shell; the uncached reads stream behind the boundary. A member who
 * already has a profile is sent to the edit form.
 */
export default function ProfileCreatePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProfileCreateGate />
    </Suspense>
  );
}

async function ProfileCreateGate() {
  await passProfileGate("create");
  return <ProfileFormContainer mode="create" />;
}
