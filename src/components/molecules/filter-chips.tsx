import { Chip } from "@/components/atoms/chip";
import { cn } from "@/lib/cn";

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
  /** Optional counter rendered lighter after the label: « Label (n) ». */
  count?: number;
}

interface FilterChipsProps<T extends string> {
  options: ReadonlyArray<FilterChipOption<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Row of toggle chips (styles from the global `.chip` class) — used for the
 * status filters of the applications management pages.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterChipsProps<T>) {
  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn(
        "flex min-w-0 flex-nowrap gap-2 overflow-x-auto border-0 pt-1 pb-2 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:py-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Chip
            key={option.id}
            className="shrink-0 whitespace-nowrap"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span className="font-normal"> ({option.count})</span>
            )}
          </Chip>
        );
      })}
    </fieldset>
  );
}
