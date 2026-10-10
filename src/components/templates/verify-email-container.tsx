"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  isAddressChangeFlow,
  type VerificationStage,
  VerifyEmailView,
} from "@/components/templates/verify-email-view";
import { checkAlreadyVerified, verifyEmail } from "@/lib/auth-client";
import { mapVerificationError } from "@/lib/auth-errors";
import { useResendVerification } from "@/lib/use-resend-verification";

/** Shape of the fallback used when the verify call itself could not be made. */
type AuthError = Parameters<typeof mapVerificationError>[0];

/**
 * Accepts only an internal path (single leading "/"), to prevent an open redirect:
 * `callbackURL` arrives from the query string and is used verbatim in a
 * navigation, so `//evil.example` would otherwise walk a freshly verified reader
 * straight off the site.
 */
function safeCallbackURL(raw: string | null): string {
  if (raw?.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}

/**
 * Orchestrator for /verify-email.
 *
 * The verification runs on mount, once the token is known: this screen *is* the
 * link's destination, so there is nothing to wait for a click on.
 */
export function VerifyEmailContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackURL = safeCallbackURL(searchParams.get("callbackURL"));
  const email = searchParams.get("email");
  // The backend reads the flow off the token and labels the link with it: a
  // change of address and a sign-up land on the same page, and only the server
  // can tell them apart.
  const flow = searchParams.get("flow");
  const isAddressChange = isAddressChangeFlow(flow);

  const [stage, setStage] = useState<VerificationStage>(
    token ? "verifying" : "invalid",
  );
  const [error, setError] = useState("");
  // On a change of address the resend would issue a *sign-up* link, which
  // verifies the address without ever applying the pending change — worse than
  // no button, so the hook is left idle and the screen offers the profile.
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
