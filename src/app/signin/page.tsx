"use client";

import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthPageFooter } from "@/components/molecules/auth-page-footer";
import { EmailField } from "@/components/molecules/email-field";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PasswordInput } from "@/components/molecules/password-input";
import { SubmitButton } from "@/components/molecules/submit-button";
import { AuthCard } from "@/components/organisms/auth-card";
import { signIn } from "@/lib/auth-client";
import {
  AUTH_SERVICE_UNAVAILABLE_MESSAGE,
  isAuthServiceUnavailable,
  mapNetworkSignInError,
  mapSignInError,
} from "@/lib/auth-errors";
import { normalizeEmail, PASSWORD_MAX_LENGTH } from "@/lib/auth-validation";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    const email = normalizeEmail(formData.get("email") as string);
    const password = formData.get("password") as string;

    try {
      const { error } = await signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (error) {
        // Server unavailable (no status or 5xx)
        if (isAuthServiceUnavailable(error)) {
          setError(AUTH_SERVICE_UNAVAILABLE_MESSAGE);
          return;
        }
        setError(mapSignInError(error));
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      // Network error or unexpected exception
      setError(mapNetworkSignInError(err));
    }
  }

  return (
    <AuthCard
      title="Connexion"
      subtitle="Accédez à la console de remplacement Kineo"
    >
      <Form action={handleSubmit} className="flex flex-col gap-5">
        <EmailField />

        <label className="flex flex-col gap-2" htmlFor="password">
          <span className="flex items-center justify-between">
            <span className="field-label">Mot de passe</span>
            <Link
              href="/forgot-password"
              className="text-xs text-muted transition-colors hover:text-primary"
            >
              Oublié ?
            </Link>
          </span>
          <PasswordInput
            name="password"
            id="password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="current-password"
            placeholder="••••••••••••"
          />
        </label>

        {error && (
          <InlineAlert as="p" tone="danger">
            {error}
          </InlineAlert>
        )}

        <SubmitButton
          label="Se connecter"
          pendingLabel="Connexion en cours..."
        />
      </Form>

      <AuthPageFooter
        lead="Nouveau sur Kineo ?"
        actionLabel="Créer un compte"
        actionHref="/signup"
      />
    </AuthCard>
  );
}
