import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ProfileEditContainer } from "@/components/templates/profile-edit-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyProfile } from "@/lib/profile-service";
import { requireMember } from "@/lib/require-member";
import { fetchServerAuth } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Modifier le profil — Kineo",
  description:
    "Modifiez votre spécialité, votre type de pratique, votre numéro RPPS et la visibilité de votre profil.",
  robots: { index: false },
};

/**
 * Static shell; the session and profile reads are uncached and stream behind the
 * boundary. An expired session goes to sign-in and a member without a profile
 * goes to the create form — both decided before the form is rendered, instead of
 * after a round trip from the browser.
 */
export default function ProfileEditPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProfileEditGate />
    </Suspense>
  );
}

async function ProfileEditGate() {
  const [auth, profile] = await Promise.all([
    fetchServerAuth(),
    // Not `.catch(() => null)`: a revoked session must sign the reader out, not
    // quietly answer "no profile" and offer them the create form.
    requireMember(fetchMyProfile(serverTransport)),
  ]);

  if (auth.status === "anonymous") {
    redirect("/signin");
  }
  if (!profile) {
    redirect("/profile/create");
  }

  return <ProfileEditContainer profile={profile} />;
}
