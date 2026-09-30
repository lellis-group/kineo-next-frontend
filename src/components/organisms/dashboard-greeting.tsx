import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { FileTextIcon, LayersIcon, PlusIcon } from "@/components/atoms/icons";
import type { DashboardAction } from "@/lib/dashboard";

const ACTION_ICONS = {
  plus: PlusIcon,
  file: FileTextIcon,
  layers: LayersIcon,
} as const;

/**
 * Welcome banner: greeting + summary + primary actions.
 * Layout follows the member mockup — full-width card, actions in a
 * wrapping row (primary first), compact vertical rhythm on mobile.
 */
export function DashboardGreeting({
  greeting,
  actions,
}: {
  greeting: { name: string; subtitle: string; meta?: string };
  actions: DashboardAction[];
}) {
  return (
    <Card className="p-5 sm:p-8">
      {/* City · speciality, when there is a profile to read them from. The
          previous fallback was the literal string "Console Live", which said
          nothing and left the line reading differently depending on whether the
          member had filled in their profile. No eyebrow beats a meaningless one. */}
      {greeting.meta && (
        <p className="text-xs font-bold tracking-widest text-muted uppercase">
          {greeting.meta}
        </p>
      )}
      <h1
        className={`text-2xl font-bold tracking-tight text-balance sm:text-3xl ${
          greeting.meta ? "mt-2" : ""
        }`}
      >
        Bonjour {greeting.name}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        {greeting.subtitle}
      </p>

      <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
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
              {Icon && <Icon />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
