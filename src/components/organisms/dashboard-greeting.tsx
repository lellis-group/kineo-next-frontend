import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { FileTextIcon, LayersIcon, PlusIcon } from "@/components/atoms/icons";
import type { DashboardAction, UserSummary } from "@/lib/dashboard";

const ACTION_ICONS = {
  plus: PlusIcon,
  file: FileTextIcon,
  layers: LayersIcon,
} as const;

/** The home's opening band: who is here, where they stand, what to do next. */
export function DashboardGreeting({
  greeting,
  actions,
}: {
  greeting: UserSummary;
  actions: DashboardAction[];
}) {
  return (
    <Card className="relative overflow-hidden px-5 py-6 shadow-[var(--shadow-card)] sm:px-8 sm:py-8">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-primary/[0.08] blur-3xl"
      />
      <span
        aria-hidden="true"
        className="tick-track pointer-events-none absolute inset-x-0 bottom-0 h-6 text-primary/[0.06]"
      />

      <div className="relative flex flex-col gap-6">
        <div className="min-w-0">
          {/* City · speciality, when there is a profile to read them from. */}
          {greeting.meta && (
            <p className="text-sm text-muted">{greeting.meta}</p>
          )}
          <h1
            className={`text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl ${
              greeting.meta ? "mt-2" : ""
            }`}
          >
            Bonjour <span className="text-primary">{greeting.name}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {greeting.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {actions.map((action) => {
            const Icon = action.icon ? ACTION_ICONS[action.icon] : undefined;
            return (
              <Button
                key={action.label}
                href={action.href}
                variant={action.variant ?? "outline"}
                className={
                  action.variant === "primary"
                    ? "btn-shine w-full sm:w-auto"
                    : "w-full sm:w-auto"
                }
              >
                {Icon && <Icon className="size-4" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
