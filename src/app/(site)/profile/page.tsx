import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileContainer } from "@/components/templates/profile-container";
import { serverTransport } from "@/lib/api-transport.server";
import { fetchMyProfile } from "@/lib/profile-service";
import { requireMember } from "@/lib/require-member";
import { fetchServerAuth } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Profil — Kineo",
  description:
    "Gérez votre profil professionnel Kineo : spécialité, type de pratique, numéro RPPS et visibilité.",
};

/**
 * The create and edit forms both land here once they succeed, so the outcome
 * travels in the URL: a success banner cannot survive a redirect otherwise, and
 * the alternative — keeping it in client state — would not survive a refresh
 * either.
 *
 * Both reads are server-side, which also settles the two navigation questions
 * the container used to answer with a `useEffect`: a member without a profile
 * goes to the create form, and an expired session goes to sign-in.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const [{ created, saved }, auth] = await Promise.all([
    searchParams,
    fetchServerAuth(),
  ]);

  if (auth.status === "anonymous") {
    redirect("/signin");
  }

  const profile = await requireMember(fetchMyProfile(serverTransport));
  if (!profile) {
    // A missing profile is an onboarding step, not an error.
    redirect("/profile/create");
  }

  return (
    <ProfileContainer
      profile={profile}
      user={auth.user}
      feedback={created ? "created" : saved ? "saved" : null}
    />
  );
}
