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
  /**
   * `card` when the heading titles a card rather than a page section: it then
   * takes the card-title size every `Panel` uses, so two cards side by side do
   * not announce themselves at two different scales.
   */
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
