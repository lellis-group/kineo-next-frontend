import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";

export interface TrustBadgeProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  className?: string;
}

/**
 * Compact horizontal trust pill (icon + label) — matches the hero trust row
 * of the landing mockup: pill shape, icon tinted in primary.
 */
export function TrustBadge({ icon: Icon, label, className }: TrustBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="text-primary">
        <Icon />
      </span>
      {label}
    </span>
  );
}
