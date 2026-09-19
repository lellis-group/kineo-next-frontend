"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ErrorState } from "@/components/organisms/error-state";
import { ProfileForm } from "@/components/organisms/profile-form";
import { ApiError } from "@/lib/api-client";
import { EMPTY_PROFILE_FORM, type ProfileFormData } from "@/lib/profile";
import {
  createProfile,
  fetchMyProfile,
  mapProfileError,
} from "@/lib/profile-service";
import { ProfileFormPage } from "./profile-form-page";

type Status = "loading" | "error" | "ready";

/** Orchestrator for /profile/create: create form, redirects to /profile/edit if profile exists. */
export function ProfileCreateContainer() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    setError("");
    fetchMyProfile()
      .then((loaded) => {
        if (loaded) {
          router.replace("/profile/edit");
          return;
        }
        setStatus("ready");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/signup");
          return;
        }
        setStatus("ready");
      });
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(
    payload: ProfileFormData,
  ): Promise<string | undefined> {
    setError("");
    try {
      await createProfile(payload);
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

  return (
    <ProfileFormPage
      backLabel="Retour à l&apos;accueil"
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
