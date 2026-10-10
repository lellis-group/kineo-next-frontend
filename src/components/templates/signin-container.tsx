"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignInView } from "@/components/templates/signin-view";
import { signIn } from "@/lib/auth-client";
import {
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  isAuthServiceUnavailable,
  mapNetworkSignInError,
  mapSignInError,
} from "@/lib/auth-errors";
import { normalizeEmail } from "@/lib/auth-validation";

/**
 * Orchestrator for /signin.
 *
 * Two failure shapes arrive here and they are told apart on purpose:
 *
 *  - better-auth *returns* an error object. `isAuthServiceUnavailable` decides
 *    whether that is the service being down (say so) or a rejected credential
 *    (say what to check).
 *  - the call *throws*, which means the request never completed. That is a
 *    network cut, not a verdict on the password, and it is worded differently.
 *
 * Conflating the two is how a mistyped password ends up reported as an outage.
 */
export function SignInContainer() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    const email = normalizeEmail(formData.get("email") as string);
    const password = formData.get("password") as string;

    try {
      const { error: failure } = await signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (failure) {
        setError(
          isAuthServiceUnavailable(failure)
            ? AUTH_SERVICE_UNAVAILABLE_MESSAGE
            : mapSignInError(failure),
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(mapNetworkSignInError(err));
    }
  }

  return <SignInView error={error} onSubmit={handleSubmit} />;
}
