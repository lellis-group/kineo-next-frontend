import type { ReactNode } from "react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { ArrowLeftIcon } from "@/components/atoms/icons";
import { PROSE_CONTAINER } from "@/lib/layout";

export interface ProfileFormPageProps {
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function ProfileFormPage({
  backLabel,
  onBack,
  title,
  subtitle,
  children,
}: ProfileFormPageProps) {
  return (
    <div className={PROSE_CONTAINER}>
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeftIcon className="h-4 w-4" />
        {backLabel}
      </Button>

      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>

        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}
