import { formatDayMonth } from "@/lib/format";
import type { StartWeekFacet } from "@/lib/listings";

/**
 * Starts to come, week by week: three figures (this week, total, busiest
 * week) over one bar per week with a line through their tops. Bars scale
 * against the busiest week.
 */
export function RailWeeks({ weeks }: { weeks: StartWeekFacet[] }) {
  const current = weeks[0];
  const last = weeks.at(-1);
  if (!current || !last) return null;

  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const busiest = weeks.reduce(
    (best, week) => (week.count > best.count ? week : best),
    current,
  );
  const max = Math.max(1, busiest.count);

  // One point per bar centre, in a 100 × 100 box stretched over the chart.
  const points = weeks
    .map((week, index) => {
      const x = ((index + 0.5) / weeks.length) * 100;
      const y = 100 - (week.count / max) * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div>
      <dl className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <div className="flex flex-col-reverse">
          <dt className="text-2xs leading-tight text-muted">Cette semaine</dt>
          <dd className="text-base leading-tight font-medium text-foreground tabular-nums">
            {current.count}
          </dd>
        </div>
        <div className="min-w-0 text-center">
          <dt className="text-2xs leading-tight text-muted">
            Sur {weeks.length} semaines
          </dt>
          <dd className="mt-1 text-4xl leading-none text-foreground tabular-nums">
            {total}
          </dd>
        </div>
        <div className="flex flex-col-reverse text-right">
          <dt className="text-2xs leading-tight text-muted">
            Pic, sem. du {formatDayMonth(busiest.weekStart)}
          </dt>
          <dd className="text-base leading-tight font-medium text-foreground tabular-nums">
            {busiest.count}
          </dd>
        </div>
      </dl>

      {/* One labelled image: the bars are decorative once their numbers are said. */}
      <div
        role="img"
        aria-label={`Départs par semaine : ${weeks
          .map((week) => `${formatDayMonth(week.weekStart)}, ${week.count}`)
          .join(" ; ")}`}
        className="relative mt-4 h-20"
      >
        <div className="absolute inset-0 flex items-end gap-1">
          {weeks.map((week, index) => (
            <span
              key={week.weekStart}
              className={
                index === 0
                  ? "flex-1 rounded-t-[2px] bg-foreground"
                  : "flex-1 rounded-t-[2px] bg-foreground/25"
              }
              // A zero week keeps a hairline.
              style={{ height: `max(2px, ${(week.count / max) * 100}%)` }}
            />
          ))}
        </div>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <polyline
            points={points}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-1.5 flex justify-between text-2xs text-muted tabular-nums">
        <span>{formatDayMonth(current.weekStart)}</span>
        <span>{formatDayMonth(last.weekStart)}</span>
      </div>
    </div>
  );
}
