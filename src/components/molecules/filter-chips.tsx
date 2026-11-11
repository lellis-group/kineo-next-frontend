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

/**
 * A status filter row — the applications screens and the candidates panel of a
 * listing.
 *
 * Drawn as the outlined track every other filter on the console uses
 * (`SegmentedControl`), as the reference draws its « All / Pending / … » row:
 * a row of separate filled chips was the one filter on the product that did
 * not look like the others. The name stays because the call sites describe
 * what it is for, not how it is drawn.
 */
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
