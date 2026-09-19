"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ErrorState } from "@/components/organisms/error-state";
import { ProfileForm } from "@/components/organisms/profile-form";
import { ApiError } from "@/lib/api-client";
import { type ProfileFormData, profileToFormValues } from "@/lib/profile";
import {
  fetchMyProfile,
  mapProfileError,
  updateProfile,
} from "@/lib/profile-service";
import type { ApiProfile } from "@/lib/types/api";
import { ProfileFormPage } from "./profile-form-page";

type Status = "loading" | "error" | "ready";

/** Orchestrator for /profile/edit: edit form, redirects to /profile/create if no profile. */
export function ProfileEditContainer() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ApiProfile | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError("");
    fetchMyProfile()
      .then((loaded) => {
        if (!loaded) {
          router.replace("/profile/create");
          return;
        }
        setProfile(loaded);
        setStatus("ready");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/signup");
          return;
        }
        if (err instanceof Error && /404/i.test(err.message)) {
          router.replace("/profile/create");
          return;
        }
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        setStatus("error");
      });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(
    payload: ProfileFormData,
  ): Promise<string | undefined> {
    if (!profile) {
      router.replace("/profile/create");
      return undefined;
    }
    setError("");
    try {
      await updateProfile(profile.id, payload);
      router.replace("/profile");
      return undefined;
    } catch (err) {
      return mapProfileError(err);
    }
  }

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "error") {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (!profile) {
    router.replace("/profile/create");
    return null;
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
