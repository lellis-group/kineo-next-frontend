import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ProfileCreateContainer } from "@/components/templates/profile-create-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyProfile } from "@/lib/profile-service";
import { requireMember } from "@/lib/require-member";
import { fetchServerAuth } from "@/lib/server-auth";

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
 *
 * A read that fails for any other reason still renders the form: this page's job
 * is to create the profile, and the failure that actually matters is reported by
 * the submit itself.
 */
export default function ProfileCreatePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProfileCreateGate />
    </Suspense>
  );
}

async function ProfileCreateGate() {
  const [auth, profile] = await Promise.all([
    fetchServerAuth(),
    // A read failure that is not an expired session still shows the form: this
    // page's job is to create the profile, and the submit reports what matters.
    // An expired one must not, though — hence the explicit 401 check.
    requireMember(fetchMyProfile(serverTransport)).catch(() => null),
  ]);

  if (auth.status === "anonymous") {
    redirect("/signin");
  }
  if (profile) {
    redirect("/profile/edit");
  }

  return <ProfileCreateContainer />;
}
