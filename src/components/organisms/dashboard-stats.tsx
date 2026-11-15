import type { ComponentType, SVGProps } from "react";
import { CalendarIcon, LayersIcon, UsersIcon } from "@/components/atoms/icons";
import { Panel } from "@/components/molecules/panel";
import { cn } from "@/lib/cn";
import type { DashboardStat } from "@/lib/dashboard";

const STAT_ICONS: Record<
  DashboardStat["icon"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  layers: LayersIcon,
  users: UsersIcon,
  calendar: CalendarIcon,
};

/**
 * The home's three headline figures, one panel each. A count is drawn large;
 * a date range (the next replacement) a step smaller, so it stays on a line.
 */
export function DashboardStats({
  stats,
  className,
}: {
  stats: DashboardStat[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {stats.map((stat, index) => {
        const Icon = STAT_ICONS[stat.icon];
        const isCount = /^\d+$/.test(stat.value);
        const isLast = index === stats.length - 1;
        return (
          <Panel
            key={stat.id}
            title={stat.title}
            className={cn(
              "flex flex-col",
              isLast && "sm:col-span-2 xl:col-span-1",
            )}
            action={
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <Icon className="size-4" />
              </span>
            }
          >
            <p
              className={cn(
                "leading-none font-normal tracking-tight text-foreground tabular-nums",
                isCount ? "text-5xl" : "text-2xl leading-tight sm:text-3xl",
              )}
            >
              {stat.value}
            </p>
            {stat.label && (
              <p className="mt-2 text-sm text-muted">{stat.label}</p>
            )}
            {stat.detail && (
              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                {stat.detail}
              </p>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
