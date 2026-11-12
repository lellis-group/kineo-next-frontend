import { ShieldIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";

export interface VerifiedBadgeProps {
  /** Overrides the label — « Identité vérifiée » in a settings context. */
  label?: string;
  /** `sm` inline next to a name · `md` standalone in a facts list. */
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "gap-1 text-xs font-medium",
  md: "gap-1.5 text-sm font-medium",
} as const;

const ICON_CLASSES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

/**
 * The "verified" marker, shared by the candidate card and the member's own
 * profile. Renders nothing when not verified (a dimmed badge reads as pending).
 */
export function VerifiedBadge({
  label = "Vérifié",
  size = "sm",
  className,
}: VerifiedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-success",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <ShieldIcon className={ICON_CLASSES[size]} />
      {label}
    </span>
  );
}
