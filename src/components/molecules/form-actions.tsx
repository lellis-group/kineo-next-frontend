"use client";

import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/atoms/button";
import { PendingButton } from "@/components/molecules/pending-button";
import { cn } from "@/lib/cn";

/**
 * The submit / cancel pair under a form or a confirmation. The pending state
 * disables both, so a double submit can't slip through.
 */
export function FormActions({
  pending,
  submitLabel,
  pendingLabel,
  onCancel,
  cancelLabel = "Annuler",
  cancelIcon,
  variant = "primary",
  type = "submit",
  onSubmit,
  submitDisabled = false,
  className,
}: {
  pending: boolean;
  submitLabel: string;
  pendingLabel?: string;
  /** Without it, no cancel button is drawn. */
  onCancel?: () => void;
  cancelLabel?: string;
  cancelIcon?: ReactNode;
  variant?: ButtonVariant;
  /** `button` for an action that isn't a form submit. */
  type?: "submit" | "button";
  onSubmit?: () => void;
  submitDisabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mt-3 flex flex-col gap-3 sm:flex-row", className)}>
      <PendingButton
        type={type}
        variant={variant}
        pending={pending}
        disabled={submitDisabled}
        onClick={onSubmit}
        idleLabel={submitLabel}
        pendingLabel={pendingLabel}
      />
      {onCancel && (
        <Button variant="ghost" disabled={pending} onClick={onCancel}>
          {cancelIcon}
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}
