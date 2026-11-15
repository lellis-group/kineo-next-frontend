import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * One block of a settings page: an anchored heading with its one-line
 * purpose and an optional action, then the content.
 */
export function SettingsSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24", className)}
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-lg font-medium">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** A settings fact: its label on the left, its value on the right. */
export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  /** A line under the label: what the value is for. */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      <dt className="min-w-0">
        <span className="block text-sm text-muted">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs text-faint">{hint}</span>
        )}
      </dt>
      <dd className="min-w-0 text-sm font-medium text-foreground sm:text-right">
        {children}
      </dd>
    </div>
  );
}
