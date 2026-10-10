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
 * The "verified" marker — shield plus label, in success green.
 *
 * Extracted because the signal is shown in two unrelated places: beside a
 * candidate's name in a listing, and in the member's own profile facts. Both
 * must read identically, otherwise a practice sees "Vérifié" on a candidate
 * and the candidate sees something else for the same field.
 *
 * Renders nothing when `verified` is false rather than a greyed-out version:
 * an absent marker and an unverified marker are different facts, and a
 * dimmed badge tends to be read as "pending" rather than "not done".
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
