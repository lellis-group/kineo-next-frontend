import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

/** One labelled value in a `<dl>`; the icon is a component so its size stays here. */
export function Fact({
  icon: Icon,
  term,
  children,
  className,
}: {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  term: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="flex items-center gap-1.5 text-control text-muted">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-faint" />}
        {term}
      </dt>
      <dd className="mt-2 text-base leading-snug font-medium break-words text-foreground">
        {children}
      </dd>
    </div>
  );
}

export function FactList({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const narrow =
    columns === 2 ? "grid-cols-2" : "grid-cols-1 min-[380px]:grid-cols-2";

  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-6 sm:gap-y-7",
        narrow,
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        columns === 4 && "sm:grid-cols-4",
        className,
      )}
    >
      {children}
    </dl>
  );
}
