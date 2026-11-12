import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ProfileFormContainer } from "@/components/templates/profile-form-container";
import { passProfileGate } from "@/lib/profile-gate";

export const metadata: Metadata = {
  title: "Modifier le profil — Kineo",
  description:
    "Modifiez votre spécialité, votre type de pratique, votre numéro RPPS et la visibilité de votre profil.",
  robots: { index: false },
};

/**
 * Static shell; the uncached reads stream behind the boundary. An expired
 * session goes to sign-in, a member without a profile to the create form.
 */
export default function ProfileEditPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProfileEditGate />
    </Suspense>
  );
}

async function ProfileEditGate() {
  const { profile } = await passProfileGate("edit");
  // `passProfileGate` redirects rather than returning null on this route.
  return <ProfileFormContainer mode="edit" profile={profile} />;
}
