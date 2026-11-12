"use client";

import { useState } from "react";
import {
  type ForgotPasswordStage,
  ForgotPasswordView,
} from "@/components/templates/forgot-password-view";
import { requestPasswordReset } from "@/lib/auth-client";
import {
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  AUTH_UNREACHABLE_MESSAGE,
  authCallFailed,
  isAuthServiceUnavailable,
  isPasswordResetDisabled,
} from "@/lib/auth-errors";

/**
 * Orchestrator for /forgot-password. `sent` never says whether the address
 * exists, so registered addresses don't leak. `not-enabled` means reset is
 * switched off on this instance.
 */
export function ForgotPasswordContainer() {
  const [stage, setStage] = useState<ForgotPasswordStage>("form");
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    const email = formData.get("email") as string;

    try {
      const { error: failure } = await requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (failure) {
        if (isPasswordResetDisabled(failure)) {
          // Its own screen — nothing about this failure is about the reader.
          setStage("not-enabled");
        } else {
          setStage("form");
          setError(
            isAuthServiceUnavailable(failure)
              ? AUTH_SERVICE_UNAVAILABLE_MESSAGE
              : authCallFailed("Envoi"),
          );
        }
        return;
      }

      setStage("sent");
    } catch {
      setError(AUTH_UNREACHABLE_MESSAGE);
    }
  }

  return (
    <ForgotPasswordView stage={stage} error={error} onSubmit={handleSubmit} />
  );
}
