"use client";

import { useFormStatus } from "react-dom";
import { PendingButton } from "@/components/molecules/pending-button";

export interface SubmitButtonProps {
  label: string;
  pendingLabel?: string;
}

/**
 * Form submit button for a `next/form` `action`.
 *
 * The pending state comes from `useFormStatus` rather than a prop, because the
 * form that owns the submission is the parent. For an inline `<form onSubmit>`
 * driven by local state, use `PendingButton` instead.
 */
export function SubmitButton({ label, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <PendingButton
      type="submit"
      size="lg"
      pending={pending}
      className="mt-2 w-full"
      idleLabel={label}
      pendingLabel={pendingLabel}
    />
  );
}
