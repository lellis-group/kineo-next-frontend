import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/atoms/card";

export interface FeatureCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <Card className="card-lift h-full p-6">
      <div
        aria-hidden="true"
        className="icon-tilt mb-5 flex h-11 w-11 items-center justify-center rounded-control bg-primary/15 text-xl text-primary"
      >
        <Icon />
      </div>

      <h3 className="mb-2 font-medium">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </Card>
  );
}
