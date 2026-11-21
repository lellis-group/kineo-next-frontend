import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ProfileContainer } from "@/components/templates/profile-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyFiles } from "@/lib/files";
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
  const [{ created, saved }, { auth, profile }, files] = await Promise.all([
    searchParams,
    passProfileGate("view"),
    // An unreachable store must not hide the profile page itself.
    fetchMyFiles(serverTransport).catch(() => []),
  ]);

  return (
    <ProfileContainer
      profile={profile}
      user={auth.user}
      files={files}
      feedback={created ? "created" : saved ? "saved" : null}
    />
  );
}
