"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { ApiProfile, ApiUser } from "@/lib/types/api";
import {
  changeEmail,
  deleteAccount,
  mapUserError,
  updateUserInfo,
} from "@/lib/user-service";
import { type ProfileFeedback, ProfileView } from "./profile-view";

/**
 * Orchestrator for /profile in view mode: the account writes, each turning
 * better-auth's rejection into French, and a refresh after success.
 */
export function ProfileContainer({
  profile,
  user,
  feedback,
}: {
  profile: ApiProfile;
  user: ApiUser;
  feedback: ProfileFeedback;
}) {
  const router = useRouter();

  const onEditProfile = useCallback(() => {
    router.push("/profile/edit");
  }, [router]);

  /** No sign-out: the account stays active until the emailed link is opened. */
  const onDeleteAccount = useCallback(async () => {
    await deleteAccount();
  }, []);

  const onUpdateInfo = useCallback(
    async (values: { name: string; image: string | null }): Promise<string> => {
      try {
        await updateUserInfo(values);
      } catch (err) {
        throw new Error(mapUserError(err));
      }
      router.refresh();
      return "Informations mises à jour.";
    },
    [router],
  );

  const onChangeEmail = useCallback(
    async (email: string): Promise<string> => {
      try {
        const { message } = await changeEmail(email);
        router.refresh();
        return message;
      } catch (err) {
        throw new Error(mapUserError(err));
      }
    },
    [router],
  );

  return (
    <ProfileView
      profile={profile}
      user={user}
      feedback={feedback}
      onEditProfile={onEditProfile}
      onUpdateInfo={onUpdateInfo}
      onChangeEmail={onChangeEmail}
      onDeleteAccount={onDeleteAccount}
    />
  );
}
