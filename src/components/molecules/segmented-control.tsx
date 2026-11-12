import { cn } from "@/lib/cn";

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: string;
  /** Optional trailing counter: « Label (n) ». */
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
 * A few mutually exclusive options inside one track; scrolls horizontally on
 * overflow rather than wrapping. For many free-standing options, see
 * `FilterChips`.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <fieldset
      className={cn(
        "flex min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {/*
        Pressed toggles in a `fieldset`, not tabs: there is no panel to swap.
      */}
      <legend className="sr-only">{ariaLabel}</legend>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-control font-medium whitespace-nowrap transition-colors",
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
    </fieldset>
  );
}
