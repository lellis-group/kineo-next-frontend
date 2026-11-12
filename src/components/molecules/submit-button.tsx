"use client";

import { useFormStatus } from "react-dom";
import { PendingButton } from "@/components/molecules/pending-button";

export interface SubmitButtonProps {
  label: string;
  pendingLabel?: string;
}

/**
 * Submit button for a `next/form` `action`; pending comes from
 * `useFormStatus`. For a locally-driven submit, see `PendingButton`.
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
