import Form from "next/form";
import type { ReactNode } from "react";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { SubmitButton } from "@/components/molecules/submit-button";

/**
 * The auth forms' shell: one submit, the error above it, and any extra note
 * the screen adds after it (the signup terms, say).
 */
export function AuthForm({
  action,
  error,
  submitLabel,
  pendingLabel,
  errorExtra,
  footer,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  error: string;
  submitLabel: string;
  pendingLabel: string;
  /** Shown under the error, e.g. the way back in for a known address. */
  errorExtra?: ReactNode;
  /** Content after the submit button, still inside the form. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Form action={action} className="flex flex-col gap-5">
      {children}

      {error && (
        <InlineAlert as="p" tone="danger">
          {error}
        </InlineAlert>
      )}

      {errorExtra}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />

      {footer}
    </Form>
  );
}
