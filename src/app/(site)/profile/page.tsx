import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ProfileContainer } from "@/components/templates/profile-container";
import { passProfileGate } from "@/lib/profile-gate";

export const metadata: Metadata = {
  title: "Profil — Kineo",
  description:
    "Gérez votre profil professionnel Kineo : spécialité, type de pratique, numéro RPPS et visibilité.",
};

/**
 * The create and edit forms land here, so their outcome travels in the URL.
 * The reads are uncached, so they sit behind a Suspense boundary.
 */
export default function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState className="min-h-[60vh]" />}>
      <ProfileContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProfileContent({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const [{ created, saved }, { auth, profile }] = await Promise.all([
    searchParams,
    passProfileGate("view"),
  ]);

  return (
    <ProfileContainer
      profile={profile}
      user={auth.user}
      feedback={created ? "created" : saved ? "saved" : null}
    />
  );
}
