import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

export interface ActivityItemProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Rich message: bold segments, names, etc. */
  children: ReactNode;
  timestamp: string;
  /** Optional detail link ("Voir" button). */
  href?: string;
}

export function ActivityItem({
  icon: Icon,
  children,
  timestamp,
  href,
}: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-3.5 sm:items-center sm:gap-4 sm:px-4">
      <span className="mt-0.5 shrink-0 text-lg text-primary sm:mt-0">
        <Icon />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug break-words">{children}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
          <span
            aria-hidden="true"
            className="h-1 w-1 shrink-0 rounded-full bg-muted"
          />
          <span className="truncate">{timestamp}</span>
        </p>
      </div>

      {href && (
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 py-2 text-sm text-muted transition-colors hover:text-primary"
        >
          Voir
        </Link>
      )}
    </div>
  );
}
