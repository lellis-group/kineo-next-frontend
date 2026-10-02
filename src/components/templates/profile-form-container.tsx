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

/**
 * What differs between the create and edit screens.
 *
 * These were two components with a body each, and the bodies were the same shape
 * line for line: read the router, submit, redirect on success, map the failure,
 * render `ProfileFormPage` around `ProfileForm`. Five values changed between
 * them, which is what a single component parameterised by a mode is for — and
 * the risk was not the duplication itself but the drift: the day one of the two
 * gained an error path, the other would quietly keep the old behaviour.
 */
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

/**
 * Orchestrator for both /profile/create and /profile/edit.
 *
 * Neither screen fetches on mount. The server page has to read the profile
 * anyway to decide whether the route is reachable at all — a member without a
 * profile belongs on the create form, one with a profile on the edit form — so
 * it is passed in rather than fetched here. Fetching it again from a `useEffect`
 * is how that redirect used to happen a beat late.
 *
 * Reaching `create` therefore already means there is no profile to edit, and
 * reaching `edit` already means there is one.
 */
/**
 * A discriminated union rather than an optional `profile`, so that `mode: "edit"`
 * cannot be reached without the id the update needs. With a plain optional prop
 * the compiler is happy and the submit path silently does nothing.
 */
type Props = { mode: "create" } | { mode: "edit"; profile: ApiProfile };

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
