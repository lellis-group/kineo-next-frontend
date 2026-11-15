import type { ComponentType, KeyboardEventHandler, SVGProps } from "react";
import { cn } from "@/lib/cn";
import { MAP_PILL } from "@/lib/layout";

/** A search input with its icon inside, labelled to screen readers only. */
export function IconField({
  id,
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onKeyDown,
  overlay = false,
  className,
}: {
  id: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  /** The white control that floats on the map. */
  overlay?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-[9rem] flex-1",
        overlay && "xl:min-w-[8rem]",
        className,
      )}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted",
            overlay && "xl:text-black/45",
          )}
        />
        <input
          id={id}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={cn(
            "field-input rounded-full py-1.5 pl-9",
            overlay && MAP_PILL,
            overlay && "xl:placeholder:text-black/45",
          )}
        />
      </div>
    </div>
  );
}
