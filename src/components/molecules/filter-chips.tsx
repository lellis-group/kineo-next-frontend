import { SegmentedControl } from "@/components/molecules/segmented-control";
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

/** A status filter row (applications, a listing's candidates). */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterChipsProps<T>) {
  return (
    <SegmentedControl
      ariaLabel={ariaLabel}
      options={options}
      value={value}
      onChange={onChange}
      className={cn("w-fit", className)}
    />
  );
}
