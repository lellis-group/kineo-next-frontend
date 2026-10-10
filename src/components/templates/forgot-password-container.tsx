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
 * Orchestrator for /forgot-password.
 *
 * Three screens, and the middle one is a trap worth naming: `sent` deliberately
 * does not say whether the address exists. Answering "no such account" would leak
 * which addresses are registered, so a request for an unknown address produces
 * the same « si un compte existe… » screen as a successful one.
 *
 * `not-enabled` is a deployment fact rather than anything about the reader — the
 * reset endpoint is switched off on this instance — so it gets its own screen
 * instead of being folded into the generic failure.
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
          // A 5xx used to be reported with the same words as a refused request.
          // It is not the reader's address that is at fault, so it now says so.
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
