import { Avatar } from "@/components/atoms/avatar";
import { Button } from "@/components/atoms/button";
import {
  CalendarIcon,
  CheckIcon,
  PencilIcon,
  ShieldIcon,
} from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { StatChip } from "@/components/molecules/panel-chrome";
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
 * The opening panel of /profile: who the member is, three figures about the
 * account in the console's chips, and what is missing, in one sentence.
 */
export function ProfileIdentity({
  user,
  profile,
  onEditProfile,
  className,
}: {
  user: ApiUser;
  profile: ApiProfile;
  onEditProfile: () => void;
  className?: string;
}) {
  const completeness = profileCompleteness(user, profile);
  const missing = completenessSentence(completeness.items);

  return (
    <Panel
      title="Mon profil"
      className={className}
      action={
        <Button variant="outline" onClick={onEditProfile} className="px-4 py-2">
          <PencilIcon className="size-4" />
          Modifier le profil pro
        </Button>
      }
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <Avatar
          name={user.name ?? user.email}
          image={user.image}
          className="size-16 text-xl sm:size-20 sm:text-2xl"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 truncate text-2xl font-medium tracking-tight sm:text-3xl">
              {user.name ?? "Mon profil"}
            </h1>
            {profile.verified && <VerifiedBadge label="Identité vérifiée" />}
          </div>
          <p className="mt-1 truncate text-sm text-muted">
            {PROFILE_TYPE_LABELS[profile.profileType]} ·{" "}
            {SPECIALTY_LABELS[profile.specialty]}
          </p>
          <p className="mt-0.5 truncate text-xs text-faint">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatChip
          icon={<CalendarIcon className="size-3.5" />}
          label="Membre depuis"
          value={formatMemberSince(user.createdAt)}
        />
        <StatChip
          icon={<CheckIcon className="size-3.5" />}
          label="Profil complété"
          value={`${completeness.done} / ${completeness.items.length}`}
        />
        <StatChip
          icon={<ShieldIcon className="size-3.5" />}
          label="Identité"
          value={profile.verified ? "Vérifiée" : "Non vérifiée"}
        />
      </div>

      {missing && <p className="mt-3 text-xs text-muted">{missing}</p>}
    </Panel>
  );
}
