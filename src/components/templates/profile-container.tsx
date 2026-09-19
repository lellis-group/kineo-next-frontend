"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoadingState } from "@/components/molecules/loading-state";
import { ErrorState } from "@/components/organisms/error-state";
import { ProfileView } from "@/components/templates/profile-view";
import { ApiError } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { fetchMyProfile } from "@/lib/profile-service";
import type { ApiProfile, ApiUser } from "@/lib/types/api";
import { deleteAccount } from "@/lib/user-service";

type Status = "loading" | "error" | "success";
type Feedback = "created" | "saved" | null;

/** Orchestrator for /profile (view mode). Edit/create happen on /profile/edit. */
export function ProfileContainer() {
  const router = useRouter();
  const { data: session } = useSession();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

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
        setStatus("success");
      })
      .catch((err) => {
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 404)
        ) {
          if (err.status === 401) {
            router.replace("/signup");
            return;
          }
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

  /**
   * Requests account deletion: better-auth emails a confirmation link and the
   * account is hard-deleted only once that link is opened (see /goodbye).
   * No sign-out here: the account stays active until confirmation.
   */
  async function handleDeleteAccount() {
    await deleteAccount();
  }

  if (status === "loading") {
    return <LoadingState className="min-h-[60vh]" />;
  }

  if (status === "error") {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (!profile || !session?.user) {
    return null;
  }

  const user = session.user as unknown as ApiUser;

  return (
    <ProfileView
      profile={profile}
      user={user}
      feedback={feedback}
      onEdit={() => {
        setFeedback(null);
        router.push("/profile/edit");
      }}
      onDeleteAccount={handleDeleteAccount}
    />
  );
}
