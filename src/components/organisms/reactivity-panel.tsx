import { GlowCard } from "@/components/atoms/glow-card";
import { ShieldIcon } from "@/components/atoms/icons";
import { StatRow } from "@/components/molecules/stat-row";
import type { ReactivityStat } from "@/lib/dashboard";

export function ReactivityPanel({
  title,
  stats,
  tipTitle,
  tip,
}: {
  title: string;
  stats: ReactivityStat[];
  tipTitle: string;
  tip: string;
}) {
  return (
    <div className="space-y-6">
      <GlowCard innerClassName="p-6">
        <h2 className="mb-2 text-base font-medium">{title}</h2>
        <div>
          {stats.map((stat) => (
            <StatRow
              key={stat.label}
              label={stat.label}
              value={stat.value}
              accent={stat.accent}
            />
          ))}
        </div>
      </GlowCard>

      <GlowCard innerClassName="p-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium">
          <span className="text-primary">
            <ShieldIcon />
          </span>
          {tipTitle}
        </p>
        <p className="text-sm leading-relaxed text-muted">{tip}</p>
      </GlowCard>
    </div>
  );
}
