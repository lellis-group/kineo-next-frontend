"use client";

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

/** Which success banner the redirect from the edit form left behind. */
export type ProfileFeedback = "created" | "saved" | null;

/**
 * The /profile screen in view mode; markup only. The writes and their error
 * mapping live in `ProfileContainer`; the data arrives from the server page.
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
          onEditProfile={onEditProfile}
          onUpdateInfo={onUpdateInfo}
          onChangeEmail={onChangeEmail}
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

        <DeleteAccountSection onDeleteAccount={onDeleteAccount} />
      </div>
    </div>
  );
}
