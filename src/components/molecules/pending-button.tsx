"use client";

import {
  Button,
  type ButtonProps,
  type ButtonVariant,
} from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";

/**
 * The spinner border colour per button variant.
 *
 * A spinner inherits `currentColor`, so the border has to name the *foreground*
 * of the variant it sits on. Eight call sites were hand-picking these strings,
 * and a new variant would have inherited whatever the last one happened to use.
 */
const SPINNER_BORDER: Record<ButtonVariant, string> = {
  primary: "border-primary-foreground/30 border-t-primary-foreground",
  secondary: "border-foreground/30 border-t-foreground",
  outline: "border-foreground/30 border-t-foreground",
  ghost: "border-foreground/30 border-t-foreground",
  danger: "border-danger-foreground/30 border-t-danger-foreground",
};

export interface PendingButtonProps
  extends Omit<ButtonProps, "children" | "href"> {
  /** True while the request is in flight. */
  pending: boolean;
  /** Label at rest. */
  idleLabel: string;
  /** Label while pending — defaults to the idle label, so the button never resizes. */
  pendingLabel?: string;
}

/**
 * A submit button that shows a spinner and swaps its label while an inline
 * `<form onSubmit>` is in flight.
 *
 * `SubmitButton` covers the other case — a `next/form` `action`, where the
 * pending state comes from `useFormStatus` — and this covers every form in the
 * app that drives its submit handler from local state instead.
 */
export function PendingButton({
  pending,
  idleLabel,
  pendingLabel,
  variant = "primary",
  disabled,
  ...rest
}: PendingButtonProps) {
  return (
    <Button
      {...rest}
      variant={variant}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && <Spinner className={`h-4 w-4 ${SPINNER_BORDER[variant]}`} />}
      {pending ? (pendingLabel ?? idleLabel) : idleLabel}
    </Button>
  );
}
