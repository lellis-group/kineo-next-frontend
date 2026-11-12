"use client";

import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/organisms/profile-form";
import {
  EMPTY_PROFILE_FORM,
  type ProfileFormData,
  profileToFormValues,
} from "@/lib/profile";
import {
  createProfile,
  mapProfileError,
  updateProfile,
} from "@/lib/profile-service";
import type { ApiProfile } from "@/lib/types/api";
import { ProfileFormPage } from "./profile-form-page";

/** What differs between the create and edit screens. */
const MODES = {
  create: {
    backHref: "/",
    backLabel: "Retour à l'accueil",
    title: "Créez votre profil professionnel",
    subtitle:
      "Renseignez votre spécialité et votre type de pratique pour publier des annonces et candidater.",
    submitLabel: "Créer mon profil",
    pendingLabel: "Création du profil…",
    /** The confirmation banner lives on /profile, so the outcome travels in the URL. */
    successQuery: "created=1",
  },
  edit: {
    backHref: "/profile",
    backLabel: "Retour au profil",
    title: "Modifier le profil professionnel",
    subtitle:
      "Mettez à jour vos informations professionnelles. Les changements seront visibles après enregistrement.",
    submitLabel: "Enregistrer les modifications",
    pendingLabel: "Enregistrement…",
    successQuery: "saved=1",
  },
} as const;

/** A union rather than an optional `profile`, so `edit` always has its id. */
type Props = { mode: "create" } | { mode: "edit"; profile: ApiProfile };

/**
 * Orchestrator for both /profile/create and /profile/edit. The server page has
 * already read the profile to decide which route is reachable, so it is passed
 * in rather than fetched here.
 */
export function ProfileFormContainer(props: Props) {
  const router = useRouter();
  const { mode } = props;
  const copy = MODES[mode];

  async function handleSubmit(
    payload: ProfileFormData,
  ): Promise<string | undefined> {
    try {
      if (props.mode === "edit") {
        await updateProfile(props.profile.id, payload);
      } else {
        await createProfile(payload);
      }
      router.replace(`/profile?${copy.successQuery}`);
      return undefined;
    } catch (err) {
      return mapProfileError(err);
    }
  }

  const initialValues =
    props.mode === "edit"
      ? profileToFormValues(props.profile)
      : EMPTY_PROFILE_FORM;

  return (
    <ProfileFormPage
      backLabel={copy.backLabel}
      onBack={() => router.replace(copy.backHref)}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      <ProfileForm
        initialValues={initialValues}
        submitLabel={copy.submitLabel}
        pendingLabel={copy.pendingLabel}
        onSubmit={handleSubmit}
      />
    </ProfileFormPage>
  );
}
