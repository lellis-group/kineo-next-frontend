"use client";

import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { SettingsNav } from "@/components/molecules/settings-nav";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/molecules/settings-section";
import { DeleteAccountSection } from "@/components/organisms/delete-account-section";
import { ProfileIdentity } from "@/components/organisms/profile-identity";
import { UserInfoFields } from "@/components/organisms/user-info-fields";
import {
  PROFILE_TYPE_DESCRIPTIONS,
  PROFILE_TYPE_LABELS,
  SPECIALTY_LABELS,
} from "@/lib/profile";
import type { ApiProfile, ApiUser } from "@/lib/types/api";

/** Which success banner the redirect from the edit form left behind. */
export type ProfileFeedback = "created" | "saved" | null;

const SECTIONS = [
  { id: "compte", label: "Compte" },
  { id: "profil-pro", label: "Profil professionnel" },
  { id: "visibilite", label: "Visibilité" },
  { id: "suppression", label: "Zone sensible" },
] as const;

const [ACCOUNT, PRO, VISIBILITY, DELETION] = SECTIONS;

/**
 * The /profile screen in view mode, as a settings page: the member on top,
 * then one section per concern, with a table of contents beside them from
 * `lg`. Markup only — the writes live in `ProfileContainer`.
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
  const editButton = (
    <Button variant="outline" onClick={onEditProfile} className="px-4 py-2">
      Modifier
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <ProfileIdentity
        user={user}
        profile={profile}
        onEditProfile={onEditProfile}
      />

      {feedback === "created" && (
        <InlineAlert tone="success" as="div" className="mt-8">
          <span className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            Votre profil a été créé avec succès.
            <Button href="/" className="shrink-0">
              Aller à mon tableau de bord
            </Button>
          </span>
        </InlineAlert>
      )}
      {feedback === "saved" && (
        <InlineAlert tone="success" className="mt-8">
          Vos modifications ont été enregistrées.
        </InlineAlert>
      )}

      <div className="mt-10 border-t border-border pt-10 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-12">
        <SettingsNav
          items={SECTIONS}
          className="sticky top-24 hidden self-start lg:block"
        />

        <div className="flex min-w-0 flex-col gap-12">
          <SettingsSection
            id={ACCOUNT.id}
            title={ACCOUNT.label}
            description="Votre nom et l'adresse e-mail de connexion."
          >
            <UserInfoFields
              user={user}
              onUpdateInfo={onUpdateInfo}
              onChangeEmail={onChangeEmail}
            />
          </SettingsSection>

          <SettingsSection
            id={PRO.id}
            title={PRO.label}
            description="Ce que les cabinets et les remplaçants voient de vous."
            action={editButton}
          >
            <Card>
              <dl className="divide-y divide-border">
                <SettingsRow
                  label="Type de pratique"
                  hint={PROFILE_TYPE_DESCRIPTIONS[profile.profileType]}
                >
                  {PROFILE_TYPE_LABELS[profile.profileType]}
                </SettingsRow>
                <SettingsRow label="Spécialité">
                  {SPECIALTY_LABELS[profile.specialty]}
                </SettingsRow>
                <SettingsRow
                  label="Numéro RPPS"
                  hint="Jamais affiché publiquement."
                >
                  {profile.rppsNumber ? (
                    <span className="tabular-nums">{profile.rppsNumber}</span>
                  ) : (
                    <span className="text-muted">Non renseigné</span>
                  )}
                </SettingsRow>
                <SettingsRow label="Ville principale">
                  {profile.city ?? (
                    <span className="text-muted">Non renseignée</span>
                  )}
                </SettingsRow>
              </dl>
            </Card>
          </SettingsSection>

          <SettingsSection
            id={VISIBILITY.id}
            title={VISIBILITY.label}
            description="Si votre profil apparaît dans l'annuaire public."
            action={editButton}
          >
            <Card>
              <dl>
                <SettingsRow
                  label="Annuaire public"
                  hint={
                    profile.isPublic
                      ? "Les cabinets peuvent trouver votre profil."
                      : "Votre profil n'apparaît pas dans l'annuaire."
                  }
                >
                  {profile.isPublic ? "Visible" : "Masqué"}
                </SettingsRow>
              </dl>
            </Card>
          </SettingsSection>

          <section
            id={DELETION.id}
            aria-label={DELETION.label}
            className="scroll-mt-24"
          >
            <DeleteAccountSection onDeleteAccount={onDeleteAccount} />
          </section>
        </div>
      </div>
    </div>
  );
}
