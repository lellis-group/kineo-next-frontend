import type { ComponentProps, ReactNode } from "react";
import { ChevronDownIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";

/**
 * Styled select — matches the field-input aesthetic.
 * Replaces the browser's native arrow with the shared `ChevronDownIcon`, so this
 * affordance and every disclosure on the app are drawn from one geometry.
 */
export interface SelectProps extends ComponentProps<"select"> {
  label?: ReactNode;
  hint?: ReactNode;
  id?: string;
}

export function Select({ label, hint, className, id, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          aria-label={typeof label === "string" ? label : undefined}
          className={cn(
            "field-input appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            className,
          )}
          {...rest}
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
