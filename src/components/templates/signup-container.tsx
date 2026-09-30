"use client";

import { useState } from "react";
import {
  SignUpConfirmationView,
  SignUpView,
} from "@/components/templates/signup-view";
import { signUp } from "@/lib/auth-client";
import { mapSignUpError } from "@/lib/auth-errors";
import {
  EMAIL_ERROR_MESSAGE,
  isValidName,
  isValidPasswordLength,
  NAME_ERROR_MESSAGE,
  normalizeEmail,
  PASSWORD_LENGTH_MESSAGE,
} from "@/lib/auth-validation";
import { useResendVerification } from "@/lib/use-resend-verification";

/**
 * Orchestrator for /signup — the form, and the "check your mailbox" screen that
 * replaces it. Lives in `templates/` next to the view, like every other
 * multi-state page here.
 */
export function SignUpContainer({ prefillEmail }: { prefillEmail?: string }) {
  const [error, setError] = useState("");
  const [existingAccount, setExistingAccount] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const { status: resend, resend: resendEmail } =
    useResendVerification(confirmationEmail);

  async function handleSubmit(formData: FormData) {
    setError("");
    setExistingAccount(false);
    const name = formData.get("name") as string;
    const email = normalizeEmail(formData.get("email") as string);
    const password = formData.get("password") as string;

    // Client-side mirror of the backend `before` hook rules — instant UX
    // feedback and no useless round-trip.
    if (!isValidName(name)) {
      setError(NAME_ERROR_MESSAGE);
      return;
    }
    if (email.length > 254) {
      setError(EMAIL_ERROR_MESSAGE);
      return;
    }
    if (!isValidPasswordLength(password)) {
      setError(PASSWORD_LENGTH_MESSAGE);
      return;
    }

    try {
      const { error } = await signUp.email({
        name: name.trim(),
        email,
        password,
        callbackURL: "/",
      });

      if (error) {
        const mapped = mapSignUpError(error);
        if (mapped.existingAccount) {
          setExistingAccount(true);
        }
        setError(mapped.message);
        return;
      }

      setConfirmationEmail(email);
    } catch {
      setError("Impossible de contacter le serveur. Réessayez plus tard.");
    }
  }

  if (confirmationEmail) {
    return (
      <SignUpConfirmationView
        email={confirmationEmail}
        resendStatus={resend}
        onResend={resendEmail}
      />
    );
  }

  return (
    <SignUpView
      prefillEmail={prefillEmail}
      passwordLength={passwordLength}
      error={error}
      existingAccount={existingAccount}
      onSubmit={handleSubmit}
      onPasswordInput={setPasswordLength}
    />
  );
}
