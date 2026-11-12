"use client";

import { useId } from "react";

export interface CountedTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The backend DTO's limit; the counter reads against it. */
  maxLength: number;
  rows?: number;
  placeholder?: string;
  className?: string;
}

/**
 * A free-text field with a « 12/500 » counter. The id is generated: several
 * can be on one page.
 */
export function CountedTextarea({
  label,
  value,
  onChange,
  maxLength,
  rows = 3,
  placeholder,
  className,
}: CountedTextareaProps) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-4">
        <span className="field-label">{label}</span>
        <span className="text-xs text-faint">
          {value.length}/{maxLength}
        </span>
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="field-input mt-2 resize-none text-sm"
      />
    </div>
  );
}
