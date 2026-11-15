import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";
import { MAP_PILL } from "@/lib/layout";

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: string;
  /** Optional trailing counter: « Label (n) ». */
  count?: number;
  /** Turns the option into an icon-only toggle; `label` becomes its name. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  /** `overlay` is the white track that floats on the map. */
  variant?: "plain" | "overlay";
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
  variant = "plain",
  className,
}: SegmentedControlProps<T>) {
  const overlay = variant === "overlay";

  return (
    <fieldset
      className={cn(
        "flex min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        overlay && MAP_PILL,
        className,
      )}
    >
      {/*
        Pressed toggles in a `fieldset`, not tabs: there is no panel to swap.
      */}
      <legend className="sr-only">{ariaLabel}</legend>
      {options.map((option) => {
        const active = option.id === value;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            aria-label={Icon ? option.label : undefined}
            title={Icon ? option.label : undefined}
            onClick={() => onChange(option.id)}
            className={cn(
              "shrink-0 rounded-full transition-colors",
              Icon
                ? "grid size-8 cursor-pointer place-items-center"
                : "px-4 py-1.5 text-control font-medium whitespace-nowrap",
              active
                ? "bg-primary text-primary-foreground"
                : cn(
                    "text-muted hover:text-foreground",
                    !Icon && "hover:bg-surface-hover",
                    overlay && "xl:text-black/50 xl:hover:text-map-ink",
                  ),
            )}
          >
            {Icon ? (
              <Icon className="size-4" />
            ) : (
              <>
                {option.label}
                {typeof option.count === "number" && (
                  <span className="font-normal opacity-70">
                    {" "}
                    ({option.count})
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
