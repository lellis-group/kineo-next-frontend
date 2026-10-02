import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ProfileView } from "@/components/templates/profile-view";
import { passProfileGate } from "@/lib/profile-gate";

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
 * The page itself is a static shell. Both reads below are uncached and have to
 * sit behind a Suspense boundary: the session is read with `headers()` and the
 * profile with `cache: "no-store"`, and reaching either from the component that
 * blocks the route is what "uncached data outside of <Suspense>" is — the route
 * then cannot be prerendered and fails the instant check.
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
    // An expired session goes to sign-in; a member without a profile goes to the
    // create form. A missing profile is an onboarding step, not an error.
    passProfileGate("view"),
  ]);

  return (
    <ProfileView
      profile={profile}
      user={auth.user}
      feedback={created ? "created" : saved ? "saved" : null}
    />
  );
}
