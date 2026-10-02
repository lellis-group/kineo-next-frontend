"use client";

import { useState } from "react";
import {
  type ForgotPasswordStage,
  ForgotPasswordView,
} from "@/components/templates/forgot-password-view";
import { requestPasswordReset } from "@/lib/auth-client";
import { AUTH_UNREACHABLE_MESSAGE } from "@/lib/auth-errors";

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
        if (isResetDisabled(failure)) {
          // Its own screen — nothing about this failure is about the reader.
          setStage("not-enabled");
        } else {
          setStage("form");
          setError(
            "L'envoi a échoué. Vérifiez votre connexion, puis réessayez.",
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

/**
 * Whether this instance has password reset switched off.
 *
 * better-auth answers with a machine code; the `message` checks are the
 * rolling-deploy fallback, the same concession documented on
 * `lib/listings/service.ts`.
 */
function isResetDisabled(failure: {
  code?: string | null;
  message?: string | null;
}): boolean {
  const code = failure.code ?? "";
  const message = (failure.message ?? "").toLowerCase();
  return (
    code === "RESET_PASSWORD_DISABLED" ||
    message.includes("isn't enabled") ||
    message.includes("not enabled")
  );
}
