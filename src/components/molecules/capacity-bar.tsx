import { cn } from "@/lib/cn";
import { percentOf } from "@/lib/format";
import { formatCapacity } from "@/lib/listings";

/** « x / y » candidats with a thin fill bar; no bar without a cap. */
export function CapacityBar({
  count,
  max,
  className,
}: {
  count: number;
  /** Le plafond de candidatures ; absent, la barre se retire. */
  max?: number | null;
  className?: string;
}) {
  // Capped: the server can hold more applications than the cap.
  const percent = percentOf(count, max ?? 0, true);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[var(--cell-gap)] whitespace-nowrap leading-[var(--cell-icon)] text-foreground tabular-nums",
        className,
      )}
      title={formatCapacity(count, max ?? undefined)}
    >
      <span>
        {count}
        {max ? <span className="text-muted"> / {max}</span> : null}
      </span>
      {max != null && max > 0 && (
        <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-border-strong">
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </span>
      )}
    </span>
  );
}
