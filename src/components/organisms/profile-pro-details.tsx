import type { ComponentType, ReactNode, SVGProps } from "react";
import { Button } from "@/components/atoms/button";
import {
  FileTextIcon,
  LayersIcon,
  MapPinIcon,
  PencilIcon,
  StethoscopeIcon,
} from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import {
  PROFILE_TYPE_DESCRIPTIONS,
  PROFILE_TYPE_LABELS,
  SPECIALTY_LABELS,
} from "@/lib/profile";
import type { ApiProfile } from "@/lib/types/api";

/** The professional profile as four tiles, with the way to edit it. */
export function ProfileProDetails({
  profile,
  onEdit,
}: {
  profile: ApiProfile;
  onEdit: () => void;
}) {
  return (
    <Panel
      title="Informations professionnelles"
      action={
        <Button variant="outline" onClick={onEdit} className="px-3.5 py-2">
          <PencilIcon className="size-3.5" />
          Modifier
        </Button>
      }
    >
      <dl className="grid gap-2 sm:grid-cols-2">
        <Fact
          icon={LayersIcon}
          label="Type de pratique"
          value={PROFILE_TYPE_LABELS[profile.profileType]}
          hint={PROFILE_TYPE_DESCRIPTIONS[profile.profileType]}
        />
        <Fact
          icon={StethoscopeIcon}
          label="Spécialité"
          value={SPECIALTY_LABELS[profile.specialty]}
        />
        <Fact
          icon={FileTextIcon}
          label="Numéro RPPS"
          value={profile.rppsNumber ?? "Non renseigné"}
          muted={!profile.rppsNumber}
          hint="Jamais affiché publiquement."
        />
        <Fact
          icon={MapPinIcon}
          label="Ville principale"
          value={profile.city ?? "Non renseignée"}
          muted={!profile.city}
        />
      </dl>
    </Panel>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  hint,
  muted = false,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: ReactNode;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-control bg-white/[0.04] px-4 py-3.5">
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd
          className={`mt-0.5 truncate text-base font-medium tabular-nums ${
            muted ? "text-muted" : "text-foreground"
          }`}
        >
          {value}
        </dd>
        {hint && (
          <dd className="mt-1 text-xs leading-relaxed text-faint">{hint}</dd>
        )}
      </div>
    </div>
  );
}
