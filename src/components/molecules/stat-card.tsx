import type { ComponentType, ReactNode, SVGProps } from "react";
import { Card } from "@/components/atoms/card";

export interface StatCardProps {
  title: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Subtle legend explaining the value. */
  label?: string;
  /** Free content below the value: badges, note, legend… */
  footer?: ReactNode;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  label,
  footer,
}: StatCardProps) {
  return (
    <Card className="flex h-full flex-col gap-1.5 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm text-muted">{title}</h3>
        <Icon className="h-5 w-5 shrink-0 text-xl text-primary" />
      </div>

      <p className="text-2xl font-medium tracking-tight break-words sm:text-3xl">
        {value}
      </p>

      {label && <p className="text-sm break-words text-muted">{label}</p>}

      {footer && (
        <div className="mt-2 flex flex-wrap items-center gap-2">{footer}</div>
      )}
    </Card>
  );
}
