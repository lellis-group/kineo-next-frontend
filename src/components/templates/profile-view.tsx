"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/button";
import { FileTextIcon, ShieldIcon } from "@/components/atoms/icons";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { ProfileSection } from "@/components/molecules/profile-section";
import { StatRow } from "@/components/molecules/stat-row";
import { VerifiedBadge } from "@/components/molecules/verified-badge";
import { DeleteAccountSection } from "@/components/organisms/delete-account-section";
import { ProfileHeaderCard } from "@/components/organisms/profile-header-card";
import { PROSE_CONTAINER } from "@/lib/layout";
import type { ApiProfile, ApiUser } from "@/lib/types/api";
import {
  changeEmail,
  deleteAccount,
  mapUserError,
  updateUserInfo,
} from "@/lib/user-service";

/** Which success banner the redirect from the edit form left behind. */
export type ProfileFeedback = "created" | "saved" | null;

/**
 * The /profile screen in view mode. Edit and create live on their own routes.
 *
 * This used to be a `ProfileContainer` and a `ProfileView` split across two
 * files, where the container existed only to hold the `"use client"` directive
 * and forward two handlers — one of which (`onDeleteAccount`) was already
 * owned by `DeleteAccountSection` below, which handles its own pending and error
 * state. Nothing was left for the split to protect.
 *
 * The profile and the account both arrive from the server page, including the
 * session user, which used to be read a second time here through the client auth
 * client and cast into place. Nothing here fetches on mount.
 */
export function ProfileView({
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
   * switches itself to the « check your mailbox » state on success.
   */
  async function handleDeleteAccount() {
    await deleteAccount();
  }

  async function handleUpdateInfo(values: {
    name: string;
    image: string | null;
  }): Promise<string> {
    try {
      await updateUserInfo(values);
    } catch (err) {
      // better-auth rejects with a plain object, not an `Error`, so the wording
      // has to be chosen here rather than by the row.
      throw new Error(mapUserError(err));
    }
    router.refresh();
    return "Informations mises à jour.";
  }

  async function handleChangeEmail(email: string): Promise<string> {
    try {
      const { message } = await changeEmail(email);
      router.refresh();
      return message;
    } catch (err) {
      throw new Error(mapUserError(err));
    }
  }

  return (
    <div className={PROSE_CONTAINER}>
      {feedback === "created" && (
        <div className="mb-6 space-y-4">
          <InlineAlert tone="success">
            Votre profil a été créé avec succès.
          </InlineAlert>
          <Button href="/" size="lg" className="w-full">
            Aller à mon tableau de bord
          </Button>
        </div>
      )}
      {feedback === "saved" && (
        <InlineAlert tone="success" className="mb-6">
          Vos modifications ont été enregistrées.
        </InlineAlert>
      )}

      <div className="space-y-6">
        <ProfileHeaderCard
          user={user}
          profile={profile}
          onEditProfile={() => {
            router.push("/profile/edit");
          }}
          onUpdateInfo={handleUpdateInfo}
          onChangeEmail={handleChangeEmail}
        />

        <ProfileSection
          icon={FileTextIcon}
          title="Informations professionnelles"
        >
          <StatRow
            label="Numéro RPPS"
            value={profile.rppsNumber ?? "Non renseigné"}
            muted={!profile.rppsNumber}
          />
          <StatRow
            label="Ville principale"
            value={profile.city ?? "Non renseignée"}
            muted={!profile.city}
          />

          {/* Same marker a practice sees beside a candidate's name — the two
              must not disagree about what "verified" means. */}
          <div className="flex items-center justify-between gap-4 border-b border-border py-3.5">
            <span className="text-sm text-muted">Identité professionnelle</span>
            {profile.verified ? (
              <VerifiedBadge label="Vérifiée" size="md" />
            ) : (
              <span className="text-sm font-medium text-foreground">
                Non vérifiée
              </span>
            )}
          </div>
        </ProfileSection>

        <ProfileSection
          icon={ShieldIcon}
          title="Visibilité"
          description={
            profile.isPublic
              ? "Votre profil apparaît dans l'annuaire public."
              : "Votre profil n'apparaît pas dans l'annuaire public."
          }
        >
          <StatRow
            label="Annuaire public"
            value={profile.isPublic ? "Visible" : "Masqué"}
            accent={profile.isPublic}
          />
        </ProfileSection>

        <DeleteAccountSection onDeleteAccount={handleDeleteAccount} />
      </div>
    </div>
  );
}
