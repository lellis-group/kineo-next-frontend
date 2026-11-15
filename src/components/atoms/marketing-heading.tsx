import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A landing section's opening: a small eyebrow pill, the title, an optional
 * line under it, and an optional aside on the right (a rating, a link).
 */
export function MarketingHeading({
  eyebrow,
  title,
  subtitle,
  aside,
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-muted">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-primary"
          />
          {eyebrow}
        </p>
        <h2 className="mt-4 text-3xl leading-[1.1] font-medium tracking-tight text-balance sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
