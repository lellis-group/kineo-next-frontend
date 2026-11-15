import type { ReactNode } from "react";
import { ChevronDownIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { MAP_PILL } from "@/lib/layout";

export interface SelectPillOption<Value extends string> {
  value: Value;
  label: ReactNode;
}

/**
 * A native select dressed as a pill, with its label inside the control so the
 * whole thing is the click target. `overlay` is the white variant that floats
 * on the map.
 */
export function SelectPill<Value extends string>({
  label,
  options,
  value,
  onChange,
  ariaLabel,
  id,
  disabled = false,
  variant = "plain",
  className,
}: {
  label: string;
  options: readonly SelectPillOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  variant?: "plain" | "overlay";
  className?: string;
}) {
  const overlay = variant === "overlay";

  return (
    <label
      className={cn(
        "flex shrink-0 cursor-pointer items-center rounded-full border border-border py-1.5 pr-1.5 pl-3.5 transition-colors hover:border-border-strong has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring",
        overlay && MAP_PILL,
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "cursor-pointer text-control whitespace-nowrap text-muted",
          overlay && "xl:text-black/45",
        )}
      >
        {label}
      </span>
      <span className="relative">
        <select
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value as Value)}
          className={cn(
            "cursor-pointer appearance-none bg-transparent py-0 pr-5 pl-1.5 text-control font-medium whitespace-nowrap text-foreground focus:outline-none disabled:cursor-not-allowed [&_option]:bg-surface [&_option]:text-foreground",
            overlay && "xl:text-map-ink",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          className={cn(
            "pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2 text-muted",
            overlay && "xl:text-black/45",
          )}
        />
      </span>
    </label>
  );
}
