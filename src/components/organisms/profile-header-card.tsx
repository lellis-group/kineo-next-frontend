"use client";

import { Avatar } from "@/components/atoms/avatar";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { PencilIcon } from "@/components/atoms/icons";
import { UserInfoFields } from "@/components/organisms/user-info-fields";
import {
  formatMemberSince,
  PROFILE_TYPE_DESCRIPTIONS,
  PROFILE_TYPE_LABELS,
  SPECIALTY_LABELS,
} from "@/lib/profile";
import type { ApiProfile, ApiUser } from "@/lib/types/api";

export function ProfileHeaderCard({
  user,
  profile,
  onEditProfile,
  onUpdateInfo,
  onChangeEmail,
}: {
  user: ApiUser;
  profile: ApiProfile;
  onEditProfile: () => void;
  onUpdateInfo: (values: {
    name: string;
    image: string | null;
  }) => Promise<string>;
  onChangeEmail: (email: string) => Promise<string>;
}) {
  return (
    <Card className="p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Avatar
            name={user.name ?? user.email}
            image={user.image}
            className="h-12 w-12 shrink-0 text-base sm:h-14 sm:w-14 sm:text-lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
              {user.name ?? "Profil"}
            </h1>
            <p className="mt-0.5 truncate text-sm break-all text-muted">
              {user.email}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={onEditProfile}
          className="w-full shrink-0 sm:w-auto"
        >
          <PencilIcon className="h-4 w-4" />
          Profil pro.
        </Button>
      </div>

      <dl className="mt-5 divide-y divide-border border-y border-border text-sm">
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-muted">Rôle</dt>
          <dd className="font-medium">
            {PROFILE_TYPE_LABELS[profile.profileType]} ·{" "}
            {SPECIALTY_LABELS[profile.specialty]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-muted">Membre depuis</dt>
          <dd className="font-medium">{formatMemberSince(user.createdAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-muted">Email vérifié</dt>
          <dd className="font-medium">{user.emailVerified ? "Oui" : "Non"}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {PROFILE_TYPE_DESCRIPTIONS[profile.profileType]}
      </p>

      <div className="mt-5 border-t border-border pt-5">
        <h2 className="mb-3 text-sm font-bold">Informations du compte</h2>
        <UserInfoFields
          user={user}
          onUpdateInfo={onUpdateInfo}
          onChangeEmail={onChangeEmail}
        />
      </div>
    </Card>
  );
}
