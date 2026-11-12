import { cn } from "@/lib/cn";

export interface BarRow {
  key: string;
  /** The name in full, for the tooltip. */
  label: string;
  /** The name as it fits under a bar. */
  short: string;
  count: number;
}

/**
 * A distribution as bars, scaled to the tallest row (not the sum) so a small
 * collection doesn't draw hairlines. The tallest bar is highlighted.
 */
export function SpecialtyBars({ rows }: { rows: readonly BarRow[] }) {
  // The panel's own zero state covers this.
  if (rows.length === 0) {
    return null;
  }

  const tallest = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="mt-5">
      <div className="flex h-20 items-end gap-1.5">
        {rows.map((row) => (
          <div
            key={row.key}
            title={`${row.label} — ${row.count}`}
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div
              className={cn(
                "w-full rounded-t-[3px]",
                row.count === tallest ? "bg-primary" : "bg-primary/35",
              )}
              style={{ height: `${Math.max(8, (row.count / tallest) * 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5">
        {rows.map((row) => (
          <span
            key={row.key}
            title={row.label}
            className="min-w-0 flex-1 truncate text-center text-[0.5625rem] leading-none text-faint"
          >
            {row.short}
          </span>
        ))}
      </div>
    </div>
  );
}
