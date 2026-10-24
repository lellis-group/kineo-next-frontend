"use client";

import { useState } from "react";
import { sendVerificationEmail } from "../auth-client";

export type ResendStatus = "idle" | "sending" | "sent" | "error";

/**
 * Resend-verification-email flow shared by the signup confirmation screen and
 * the verify-email page. `email` may be null (unknown address) — resend is a no-op.
 */
export function useResendVerification(email: string | null) {
  const [status, setStatus] = useState<ResendStatus>("idle");

  async function resend() {
    if (!email) {
      return;
    }

    setStatus("sending");
    try {
      const { error } = await sendVerificationEmail({ email });
      setStatus(error ? "error" : "sent");
    } catch {
      setStatus("error");
    }
  }

  return { status, resend };
}
