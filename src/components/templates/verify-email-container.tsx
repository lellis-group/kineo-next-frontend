"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type VerificationStage,
  VerifyEmailView,
} from "@/components/templates/verify-email-view";
import { checkAlreadyVerified, verifyEmail } from "@/lib/auth-client";
import { mapVerificationError } from "@/lib/auth-errors";
import { useResendVerification } from "@/lib/hooks/use-resend-verification";
import { safeInternalPath } from "@/lib/safe-redirect";
import { isAddressChangeFlow } from "@/lib/verification-flow";

/** Shape of the fallback used when the verify call itself could not be made. */
type AuthError = Parameters<typeof mapVerificationError>[0];

/** Orchestrator for /verify-email; verifies on mount. */
export function VerifyEmailContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackURL = safeInternalPath(searchParams.get("callbackURL"));
  const email = searchParams.get("email");
  // Set by the backend: only it can tell a sign-up from an address change.
  const flow = searchParams.get("flow");
  const isAddressChange = isAddressChangeFlow(flow);

  const [stage, setStage] = useState<VerificationStage>(
    token ? "verifying" : "invalid",
  );
  const [error, setError] = useState("");
  // On an address change a resend would issue a *sign-up* link, so it stays idle.
  const { status: resend, resend: resendEmail } = useResendVerification(
    isAddressChange ? null : email,
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    // Single-use token: StrictMode's double-mount must not consume it twice.
    let cancelled = false;

    (async () => {
      const { error: failure } = await verifyEmail({ query: { token } }).catch(
        (): { error: AuthError } => ({ error: { status: 0 } }),
      );

      if (cancelled) {
        return;
      }

      if (!failure) {
        setStage("success");
        return;
      }

      if (await checkAlreadyVerified(token)) {
        if (!cancelled) {
          setStage("success");
        }
        return;
      }

      if (cancelled) {
        return;
      }

      setStage("error");
      setError(mapVerificationError(failure));
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <VerifyEmailView
      stage={stage}
      flow={isAddressChange ? flow : undefined}
      error={error}
      resendStatus={resend}
      onResend={resendEmail}
      onContinue={() => {
        router.push(callbackURL);
        router.refresh();
      }}
    />
  );
}
