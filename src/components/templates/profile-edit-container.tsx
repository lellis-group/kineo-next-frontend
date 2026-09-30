"use client";

import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/organisms/profile-form";
import { type ProfileFormData, profileToFormValues } from "@/lib/profile";
import { mapProfileError, updateProfile } from "@/lib/profile-service";
import type { ApiProfile } from "@/lib/types/api";
import { ProfileFormPage } from "./profile-form-page";

/**
 * Orchestrator for /profile/edit.
 *
 * The profile is a required prop rather than something fetched here: the page
 * has to load it anyway to decide whether this route is even reachable (no
 * profile means the member belongs on the create form), and fetching it twice
 * was how that redirect used to happen a beat late, from a `useEffect`.
 */
export function ProfileEditContainer({ profile }: { profile: ApiProfile }) {
  const router = useRouter();

  async function handleSubmit(
    payload: ProfileFormData,
  ): Promise<string | undefined> {
    try {
      await updateProfile(profile.id, payload);
      // The confirmation banner lives on /profile, so the outcome travels in the
      // URL through the redirect.
      router.replace("/profile?saved=1");
      return undefined;
    } catch (err) {
      return mapProfileError(err);
    }
  }

  return (
    <ProfileFormPage
      backLabel="Retour au profil"
      onBack={() => router.replace("/profile")}
      title="Modifier le profil professionnel"
      subtitle="Mettez à jour vos informations professionnelles. Les changements seront visibles après enregistrement."
    >
      <ProfileForm
        initialValues={profileToFormValues(profile)}
        submitLabel="Enregistrer les modifications"
        pendingLabel="Enregistrement…"
        onSubmit={handleSubmit}
      />
    </ProfileFormPage>
  );
}
