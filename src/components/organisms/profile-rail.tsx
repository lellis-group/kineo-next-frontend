import { Avatar } from "@/components/atoms/avatar";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { CheckIcon, PencilIcon } from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { VerifiedBadge } from "@/components/molecules/verified-badge";
import { cn } from "@/lib/cn";
import {
  formatMemberSince,
  PROFILE_TYPE_LABELS,
  profileCompleteness,
  SPECIALTY_LABELS,
} from "@/lib/profile";
import type { ApiProfile, ApiUser } from "@/lib/types/api";

/**
 * The rail of /profile: who the member is, how complete their profile is,
 * and whether practices can find them.
 */
export function ProfileRail({
  user,
  profile,
  onEditProfile,
}: {
  user: ApiUser;
  profile: ApiProfile;
  onEditProfile: () => void;
}) {
  const completeness = profileCompleteness(user, profile);

  return (
    <div className="flex flex-col gap-3">
      <IdentityCard user={user} profile={profile} onEdit={onEditProfile} />

      <Panel
        title="Complétude du profil"
        action={
          <span className="text-sm text-muted tabular-nums">
            <span className="text-foreground">{completeness.done}</span> /{" "}
            {completeness.items.length}
          </span>
        }
      >
        <ul className="flex flex-col gap-2.5">
          {completeness.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full",
                  item.done
                    ? "bg-success/15 text-success"
                    : "border border-dashed border-border-strong",
                )}
              >
                {item.done && <CheckIcon className="size-3" />}
              </span>
              <span className={item.done ? "text-foreground" : "text-muted"}>
                {item.label}
              </span>
              <span className="sr-only">
                {item.done ? "(renseigné)" : "(à compléter)"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Visibilité">
        <div className="flex items-center gap-3 rounded-control bg-white/[0.04] px-3 py-3">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              profile.isPublic ? "bg-success" : "bg-muted",
            )}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              {profile.isPublic ? "Visible dans l'annuaire" : "Masqué"}
            </span>
            <span className="block text-xs leading-relaxed text-muted">
              {profile.isPublic
                ? "Les cabinets peuvent trouver votre profil. Votre numéro RPPS n'y figure jamais."
                : "Votre profil n'apparaît pas dans l'annuaire public."}
            </span>
          </span>
        </div>
      </Panel>
    </div>
  );
}

function IdentityCard({
  user,
  profile,
  onEdit,
}: {
  user: ApiUser;
  profile: ApiProfile;
  onEdit: () => void;
}) {
  return (
    <Card className="relative overflow-hidden px-5 pt-6 pb-5 shadow-[var(--shadow-card)] sm:px-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-10 size-64 rounded-full bg-primary/[0.08] blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center">
        <Avatar
          name={user.name ?? user.email}
          image={user.image}
          className="size-20 text-2xl"
        />
        <h1 className="mt-4 max-w-full truncate text-xl font-medium tracking-tight">
          {user.name ?? "Profil"}
        </h1>
        <p className="mt-0.5 max-w-full truncate text-sm text-muted">
          {user.email}
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            {PROFILE_TYPE_LABELS[profile.profileType]}
          </span>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-foreground">
            {SPECIALTY_LABELS[profile.specialty]}
          </span>
        </div>
      </div>

      <dl className="relative mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-control bg-white/[0.04] px-3 py-2.5">
          <dt className="text-2xs text-muted">Membre depuis</dt>
          <dd className="mt-0.5 truncate text-sm font-medium first-letter:uppercase">
            {formatMemberSince(user.createdAt)}
          </dd>
        </div>
        <div className="rounded-control bg-white/[0.04] px-3 py-2.5">
          <dt className="text-2xs text-muted">Identité</dt>
          <dd className="mt-0.5 text-sm font-medium">
            {profile.verified ? (
              <VerifiedBadge label="Vérifiée" size="md" />
            ) : (
              <span className="text-muted">Non vérifiée</span>
            )}
          </dd>
        </div>
      </dl>

      <Button
        variant="outline"
        onClick={onEdit}
        className="relative mt-4 w-full"
      >
        <PencilIcon className="size-4" />
        Modifier le profil pro
      </Button>
    </Card>
  );
}
