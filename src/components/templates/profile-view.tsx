"use client";

import { Button } from "@/components/atoms/button";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { Panel } from "@/components/molecules/panel";
import { DeleteAccountSection } from "@/components/organisms/delete-account-section";
import { ProfileProDetails } from "@/components/organisms/profile-pro-details";
import { ProfileRail } from "@/components/organisms/profile-rail";
import { UserInfoFields } from "@/components/organisms/user-info-fields";
import { BoardShell } from "@/components/templates/board-shell";
import { SITE_SHELL } from "@/lib/layout";
import type { ApiProfile, ApiUser } from "@/lib/types/api";

/** Which success banner the redirect from the edit form left behind. */
export type ProfileFeedback = "created" | "saved" | null;

/**
 * The /profile screen in view mode, on the console's board: the member's
 * card, completeness and visibility down the rail; the account, the
 * professional details and the deletion beside it. Markup only — the writes
 * and their error mapping live in `ProfileContainer`.
 */
export function ProfileView({
  profile,
  user,
  feedback,
  onEditProfile,
  onUpdateInfo,
  onChangeEmail,
  onDeleteAccount,
}: {
  profile: ApiProfile;
  user: ApiUser;
  feedback: ProfileFeedback;
  onEditProfile: () => void;
  onUpdateInfo: (values: {
    name: string;
    image: string | null;
  }) => Promise<string>;
  onChangeEmail: (email: string) => Promise<string>;
  onDeleteAccount: () => Promise<void>;
}) {
  return (
    <>
      {/* Above the board, so a phone sees it before the rail. */}
      {feedback && (
        <div className={`${SITE_SHELL} pt-4`}>
          {feedback === "created" && (
            <InlineAlert tone="success" as="div">
              <span className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                Votre profil a été créé avec succès.
                <Button href="/" className="shrink-0">
                  Aller à mon tableau de bord
                </Button>
              </span>
            </InlineAlert>
          )}
          {feedback === "saved" && (
            <InlineAlert tone="success">
              Vos modifications ont été enregistrées.
            </InlineAlert>
          )}
        </div>
      )}

      <BoardShell
        railFirst
        className="lg:py-4"
        rail={
          <ProfileRail
            user={user}
            profile={profile}
            onEditProfile={onEditProfile}
          />
        }
      >
        <Panel title="Informations du compte">
          <UserInfoFields
            user={user}
            onUpdateInfo={onUpdateInfo}
            onChangeEmail={onChangeEmail}
          />
        </Panel>

        <ProfileProDetails profile={profile} onEdit={onEditProfile} />

        <DeleteAccountSection onDeleteAccount={onDeleteAccount} />
      </BoardShell>
    </>
  );
}
