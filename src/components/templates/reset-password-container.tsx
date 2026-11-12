"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  type ResetPasswordStage,
  ResetPasswordView,
} from "@/components/templates/reset-password-view";
import { resetPassword } from "@/lib/auth-client";
import {
  AUTH_UNREACHABLE_MESSAGE,
  mapResetPasswordError,
} from "@/lib/auth-errors";
import {
  isValidPasswordLength,
  PASSWORD_LENGTH_MESSAGE,
} from "@/lib/auth-validation";

/**
 * Orchestrator for /reset-password. The mismatch check runs before the length
 * check: two different passwords is the thing to report.
 */
export function ResetPasswordContainer() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // No token always wins over a stale success flag.
  const stage: ResetPasswordStage = !token
    ? "invalid-link"
    : done
      ? "done"
      : "form";

  async function handleSubmit(formData: FormData) {
    setError("");
    const newPassword = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (newPassword !== confirm) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    // Client-side mirror of the backend policy (8–128 chars, same as signup).
    if (!isValidPasswordLength(newPassword)) {
      setError(PASSWORD_LENGTH_MESSAGE);
      return;
    }

    try {
      const { error: failure } = await resetPassword({ newPassword, token });

      if (failure) {
        setError(mapResetPasswordError(failure));
        return;
      }

      setDone(true);
    } catch {
      setError(AUTH_UNREACHABLE_MESSAGE);
    }
  }

  return (
    <ResetPasswordView
      stage={stage}
      error={error}
      onSubmit={handleSubmit}
      onSignIn={() => router.push("/signin")}
    />
  );
}
