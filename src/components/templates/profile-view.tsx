"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { Button } from "@/components/atoms/button";
import {
  FileTextIcon,
  LayersIcon,
  MapPinIcon,
  ShieldIcon,
  StethoscopeIcon,
} from "@/components/atoms/icons";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { Panel } from "@/components/molecules/panel";
import { DeleteAccountSection } from "@/components/organisms/delete-account-section";
import { ProfileIdentity } from "@/components/organisms/profile-identity";
import { ProfileLocation } from "@/components/organisms/profile-location";
import { UserInfoFields } from "@/components/organisms/user-info-fields";
import { cn } from "@/lib/cn";
import { SITE_SHELL } from "@/lib/layout";
import {
  PROFILE_TYPE_DESCRIPTIONS,
  PROFILE_TYPE_LABELS,
  SPECIALTY_LABELS,
} from "@/lib/profile";
import type { ApiProfile, ApiUser } from "@/lib/types/api";

/** Which success banner the redirect from the edit form left behind. */
export type ProfileFeedback = "created" | "saved" | null;

/**
 * The /profile screen in view mode, as a grid of console panels: the member
 * and where they practise on top, then the account, the professional
 * details and the visibility, and the deletion at the foot. Markup only —
 * the writes live in `ProfileContainer`.
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
  const editLink = (
    <button
      type="button"
      onClick={onEditProfile}
      className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      Modifier
    </button>
  );

  return (
    <div className={`${SITE_SHELL} flex flex-col gap-3 py-4 lg:py-6`}>
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ProfileIdentity
          user={user}
          profile={profile}
          onEditProfile={onEditProfile}
        />
        <ProfileLocation
          city={profile.city}
          onEdit={onEditProfile}
          className="flex flex-col"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Compte" flush>
          <div className="border-t border-border">
            <UserInfoFields
              user={user}
              onUpdateInfo={onUpdateInfo}
              onChangeEmail={onChangeEmail}
            />
          </div>
        </Panel>

        <Panel title="Profil professionnel" flush action={editLink}>
          <dl className="divide-y divide-border border-t border-border">
            <ProRow
              icon={LayersIcon}
              label="Type de pratique"
              hint={PROFILE_TYPE_DESCRIPTIONS[profile.profileType]}
            >
              {PROFILE_TYPE_LABELS[profile.profileType]}
            </ProRow>
            <ProRow icon={StethoscopeIcon} label="Spécialité">
              {SPECIALTY_LABELS[profile.specialty]}
            </ProRow>
            <ProRow
              icon={FileTextIcon}
              label="Numéro RPPS"
              hint="Jamais affiché publiquement."
              muted={!profile.rppsNumber}
            >
              {profile.rppsNumber ?? "Non renseigné"}
            </ProRow>
            <ProRow
              icon={MapPinIcon}
              label="Ville principale"
              muted={!profile.city}
            >
              {profile.city ?? "Non renseignée"}
            </ProRow>
          </dl>
        </Panel>

        <Panel
          title="Visibilité"
          action={editLink}
          className="lg:col-span-2 xl:col-span-1"
        >
          <div className="flex items-center gap-3 rounded-control bg-white/[0.04] px-4 py-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <ShieldIcon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xs text-muted">Annuaire public</span>
              <span className="block text-base font-medium text-foreground">
                {profile.isPublic ? "Visible" : "Masqué"}
              </span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {profile.isPublic
              ? "Les cabinets peuvent trouver votre profil dans l'annuaire. Votre numéro RPPS n'y figure jamais."
              : "Votre profil n'apparaît pas dans l'annuaire public. Vous pouvez toujours candidater et publier."}
          </p>
        </Panel>
      </div>

      <DeleteAccountSection onDeleteAccount={onDeleteAccount} />
    </div>
  );
}

/** One fact of the professional profile: mark, label, value — as the rails list them. */
function ProRow({
  icon: Icon,
  label,
  hint,
  muted = false,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  hint?: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <dt className="text-sm text-muted">{label}</dt>
        {hint && <dd className="mt-0.5 text-xs text-faint">{hint}</dd>}
      </div>
      <dd
        className={cn(
          "shrink-0 text-right text-sm font-medium tabular-nums",
          muted ? "text-muted" : "text-foreground",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
