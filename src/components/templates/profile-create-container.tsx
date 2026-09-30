"use client";

import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/organisms/profile-form";
import { EMPTY_PROFILE_FORM, type ProfileFormData } from "@/lib/profile";
import { createProfile, mapProfileError } from "@/lib/profile-service";
import { ProfileFormPage } from "./profile-form-page";

/**
 * Orchestrator for /profile/create.
 *
 * Reaching this page at all means there is no profile: the server page checks
 * and redirects to the edit form if there is one, so the container has no
 * loading state to own and nothing to fetch on mount.
 */
export function ProfileCreateContainer() {
  const router = useRouter();

  async function handleSubmit(
    payload: ProfileFormData,
  ): Promise<string | undefined> {
    try {
      await createProfile(payload);
      // The banner that confirms this lives on /profile, so the outcome travels
      // in the URL through the redirect.
      router.replace("/profile?created=1");
      return undefined;
    } catch (err) {
      return mapProfileError(err);
    }
  }

  return (
    <ProfileFormPage
      backLabel="Retour à l'accueil"
      onBack={() => router.replace("/")}
      title="Créez votre profil professionnel"
      subtitle="Renseignez votre spécialité et votre type de pratique pour publier des annonces et candidater."
    >
      <ProfileForm
        initialValues={EMPTY_PROFILE_FORM}
        submitLabel="Créer mon profil"
        pendingLabel="Création du profil…"
        onSubmit={handleSubmit}
      />
    </ProfileFormPage>
  );
}
