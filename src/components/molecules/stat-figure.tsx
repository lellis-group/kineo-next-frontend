import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const ALIGN = {
  left: "flex flex-col-reverse",
  center: "min-w-0 text-center",
  right: "flex-col-reverse text-right",
} as const;

/** A label and its figure in a `<dl>`, as the rails draw them. */
export function StatFigure({
  label,
  value,
  size = "md",
  align = "left",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** `lg` is the panel's headline figure. */
  size?: "md" | "lg";
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <div className={cn(ALIGN[align], className)}>
      <dt className="text-2xs leading-tight text-muted">{label}</dt>
      <dd
        className={cn(
          "text-foreground tabular-nums",
          size === "lg"
            ? "mt-1.5 text-4xl leading-none"
            : "text-base leading-tight font-medium",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
