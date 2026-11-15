import type { ReactNode } from "react";
import { PasswordInput } from "@/components/molecules/password-input";

/** A password field with its label, an optional side note, and the reveal toggle. */
export function PasswordField({
  id,
  name = "password",
  label = "Mot de passe",
  autoComplete,
  minLength,
  maxLength,
  required = true,
  onInput,
  /** A hint or a link, right of the label. */
  action,
}: {
  id: string;
  name?: string;
  label?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  onInput?: (length: number) => void;
  action?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="flex items-center justify-between gap-2">
        <span className="field-label">{label}</span>
        {action}
      </span>
      <PasswordInput
        name={name}
        id={id}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder="••••••••••••"
        onInput={
          onInput
            ? (event) => onInput(event.currentTarget.value.length)
            : undefined
        }
      />
    </label>
  );
}
