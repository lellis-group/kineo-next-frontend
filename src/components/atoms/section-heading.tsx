import type { ReactNode } from "react";

export function SectionHeading({
  title,
  subtitle,
  action,
  size = "section",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** `card` for a card title: the same size `Panel` uses. */
  size?: "section" | "card";
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2
          className={
            size === "card"
              ? "text-lg leading-tight font-medium"
              : "text-xl font-medium tracking-tight sm:text-2xl"
          }
        >
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
