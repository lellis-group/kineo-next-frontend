import { cn } from "@/lib/cn";

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: string;
  /** Optional trailing counter, rendered lighter: « Label (n) ». */
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * A row of mutually exclusive options inside one contained track.
 *
 * A molecule, not an atom: it is a track built out of one button per option, so
 * it composes atoms rather than being one. It sits beside `FilterChips`, which
 * is the same shape built for a different question — chips are free-standing and
 * scroll on a narrow screen because there can be many of them, while this
 * answers "which of these few" and carries the selection as a filled pill inside
 * a recessed track.
 *
 * Scrolls horizontally on overflow for the same reason chips do: a narrow screen
 * has to keep one option reachable rather than wrap the track into a shape that
 * no longer reads as one control.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span className="font-normal opacity-70"> ({option.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
