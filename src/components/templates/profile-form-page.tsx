import type { ReactNode } from "react";
import { Card } from "@/components/atoms/card";
import { BackLink } from "@/components/molecules/back-link";
import { PROSE_CONTAINER } from "@/lib/layout";

export interface ProfileFormPageProps {
  backLabel: string;
  /** Where « back » goes; the form is left with a history replace. */
  backHref: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function ProfileFormPage({
  backLabel,
  backHref,
  title,
  subtitle,
  children,
}: ProfileFormPageProps) {
  return (
    <div className={PROSE_CONTAINER}>
      <BackLink href={backHref} replace className="mb-6">
        {backLabel}
      </BackLink>

      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>

        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}
