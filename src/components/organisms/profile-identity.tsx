import { Avatar } from "@/components/atoms/avatar";
import { Button } from "@/components/atoms/button";
import { PencilIcon } from "@/components/atoms/icons";
import { VerifiedBadge } from "@/components/molecules/verified-badge";
import {
  completenessSentence,
  formatMemberSince,
  PROFILE_TYPE_LABELS,
  profileCompleteness,
  SPECIALTY_LABELS,
} from "@/lib/profile";
import type { ApiProfile, ApiUser } from "@/lib/types/api";

/**
 * The top of /profile: who the member is, in one line, and what is missing
 * from their profile, in one sentence.
 */
export function ProfileIdentity({
  user,
  profile,
  avatarUrl,
  onEditProfile,
}: {
  user: ApiUser;
  profile: ApiProfile;
  /** The uploaded photo wins over the legacy better-auth image URL. */
  avatarUrl?: string | null;
  onEditProfile: () => void;
}) {
  const missing = completenessSentence(
    profileCompleteness(user, profile).items,
  );

  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <Avatar
          name={user.name ?? user.email}
          image={avatarUrl ?? user.image}
          className="size-16 text-xl sm:size-20 sm:text-2xl"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 truncate text-2xl font-medium tracking-tight sm:text-3xl">
              {user.name ?? "Mon profil"}
            </h1>
            {profile.verified && <VerifiedBadge label="Identité vérifiée" />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>{PROFILE_TYPE_LABELS[profile.profileType]}</span>
            <span aria-hidden="true">·</span>
            <span>{SPECIALTY_LABELS[profile.specialty]}</span>
          </p>
          <p className="mt-1 text-xs text-faint">
            Membre depuis {formatMemberSince(user.createdAt)}
            {missing && <> · {missing}</>}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={onEditProfile}
        className="w-full shrink-0 sm:w-auto"
      >
        <PencilIcon className="size-4" />
        Modifier le profil pro
      </Button>
    </header>
  );
}
