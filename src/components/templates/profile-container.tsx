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
 * Orchestrator for the /profile screen in view mode.
 *
 * The view is markup; this file is the three account writes it offers and the
 * one thing they have in common. Every better-auth rejection arrives as a plain
 * object rather than an `Error`, so each handler has to turn it into French
 * before it crosses into the view — the row that reports a failed save knows
 * nothing about the auth client. Keeping that mapping here means the view can
 * be rendered from static data with no service import at all.
 *
 * It also owns the refresh: an account write changes what the server page would
 * read next, so the handlers refresh after success. The delete request does not
 * need one — the account stays active until the emailed link is opened, and the
 * section switches itself to the « check your mailbox » state on its own.
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

  /**
   * Requests account erasure: better-auth emails a confirmation link and the
   * account is anonymized only once that link is opened (see /goodbye).
   * No sign-out here: the account stays active until confirmation.
   */
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
