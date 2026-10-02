import type { ComponentType, ReactNode, SVGProps } from "react";
import { Card } from "@/components/atoms/card";

type SectionIcon = ComponentType<SVGProps<SVGSVGElement>>;

export function ProfileSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: SectionIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
        >
          <Icon />
        </span>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
