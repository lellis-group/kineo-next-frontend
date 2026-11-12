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
 * Orchestrator for /signin. A returned error object may be a rejected
 * credential or an outage (`isAuthServiceUnavailable`); a thrown call is a
 * network cut. Each is worded differently.
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
