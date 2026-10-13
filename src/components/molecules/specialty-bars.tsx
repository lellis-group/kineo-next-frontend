import { cn } from "@/lib/cn";

export interface BarRow {
  /** Stable key — the specialty id. */
  key: string;
  /** The name in full, for the tooltip. */
  label: string;
  /** The name as it fits under a bar. */
  short: string;
  count: number;
}

/**
 * A distribution as bars under a total — the reference's volume card.
 *
 * Its own component because the one thing it has to do is not drawing: scaling
 * to the tallest row rather than to the sum. A collection whose busiest specialty
 * holds four openings would otherwise draw hairline bars and read as an empty
 * panel, and the reader would conclude nothing is there.
 *
 * The tallest bar is cream and the rest are a step back from it, which is the
 * reference's own two-tone: it keeps the eye on the one column that owns the
 * total above, with no legend to explain why.
 *
 * Every bar is `title`d with the full name, because the label under it is the
 * compromise the width forces and has to stay reachable in full.
 */
export function SpecialtyBars({ rows }: { rows: readonly BarRow[] }) {
  // No rows is not an empty chart: it is a collection with nothing to spread,
  // and the panel's own zero state says so already.
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
