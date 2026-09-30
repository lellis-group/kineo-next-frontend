"use client";

import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/templates/profile-view";
import type { ApiProfile, ApiUser } from "@/lib/types/api";
import { deleteAccount } from "@/lib/user-service";

export type ProfileFeedback = "created" | "saved" | null;

/**
 * Orchestrator for /profile (view mode). Edit/create happen on /profile/edit.
 *
 * The profile and the account both arrive from the server page — including the
 * session user, which used to be read a second time here through the client
 * auth client and cast into place. Nothing on this screen fetches on mount.
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

  /**
   * Requests account erasure: better-auth emails a confirmation link and the
   * account is anonymized only once that link is opened (see /goodbye).
   * No sign-out here: the account stays active until confirmation — the panel
   * below switches itself to the "check your mailbox" state on success.
   */
  async function handleDeleteAccount() {
    await deleteAccount();
  }

  return (
    <ProfileView
      profile={profile}
      user={user}
      feedback={feedback}
      onEdit={() => {
        router.push("/profile/edit");
      }}
      onDeleteAccount={handleDeleteAccount}
    />
  );
}
