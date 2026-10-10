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
 * Static shell; the session and profile reads are uncached and stream behind the
 * boundary. An expired session goes to sign-in and a member who already has a
 * profile is sent to the edit form — both decided before the form renders.
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
