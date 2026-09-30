"use client";

import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/atoms/button";
import { AuthPageFooter } from "@/components/molecules/auth-page-footer";
import { EmailField } from "@/components/molecules/email-field";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PasswordInput } from "@/components/molecules/password-input";
import { ResendVerification } from "@/components/molecules/resend-verification";
import { SubmitButton } from "@/components/molecules/submit-button";
import { AuthCard } from "@/components/organisms/auth-card";
import {
  NAME_MAX_LENGTH,
  NAME_PATTERN,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-validation";
import type { ResendStatus } from "@/lib/use-resend-verification";

/**
 * The two screens signup has: the form, and the "check your mailbox"
 * confirmation that replaces it once the account exists.
 *
 * Split out from the container because they share no state beyond the
 * confirmation address, and every other multi-state page in the app keeps its
 * markup in a `*-view` next to the orchestrating container.
 */
export function SignUpView({
  prefillEmail,
  passwordLength,
  error,
  existingAccount,
  onSubmit,
  onPasswordInput,
}: {
  prefillEmail?: string;
  passwordLength: number;
  error: string;
  /** The address is already registered — offer the way back in, not a retry. */
  existingAccount: boolean;
  onSubmit: (formData: FormData) => void;
  onPasswordInput: (length: number) => void;
}) {
  const passwordInRange =
    passwordLength >= PASSWORD_MIN_LENGTH &&
    passwordLength <= PASSWORD_MAX_LENGTH;

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Rejoignez la console de remplacement Kineo"
    >
      <Form action={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="field-label">Nom complet</span>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            maxLength={NAME_MAX_LENGTH}
            pattern={NAME_PATTERN}
            placeholder="Dr Jean Dupont"
            className="field-input"
          />
        </label>

        <EmailField defaultValue={prefillEmail} />

        <label className="flex flex-col gap-2" htmlFor="password">
          <span className="flex items-center justify-between">
            <span className="field-label">Mot de passe</span>
            <span
              className={
                passwordInRange
                  ? "text-xs font-medium text-primary transition-colors"
                  : "text-xs text-muted transition-colors"
              }
            >
              {passwordInRange
                ? `✓ Longueur valide (${PASSWORD_MIN_LENGTH} à ${PASSWORD_MAX_LENGTH})`
                : `${PASSWORD_MIN_LENGTH} à ${PASSWORD_MAX_LENGTH} caractères`}
            </span>
          </span>
          <PasswordInput
            name="password"
            id="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            placeholder="••••••••••••"
            onInput={(event) =>
              onPasswordInput(event.currentTarget.value.length)
            }
          />
        </label>

        {error && (
          <InlineAlert as="p" tone="danger">
            {error}
          </InlineAlert>
        )}

        {error && existingAccount && (
          <p className="-mt-3 text-center text-sm">
            <Link
              href="/signin"
              className="font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Se connecter avec cet e-mail
            </Link>
          </p>
        )}

        <SubmitButton
          label="Créer mon compte"
          pendingLabel="Création du compte..."
        />

        <p className="text-center text-xs leading-relaxed text-muted">
          En créant un compte, vous acceptez nos{" "}
          <Link
            href="/terms"
            className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
          >
            conditions d'utilisation
          </Link>
          .
        </p>
      </Form>

      <AuthPageFooter
        lead="Déjà sur Kineo ?"
        actionLabel="Se connecter"
        actionHref="/signin"
      />
    </AuthCard>
  );
}

/** Shown instead of the form once the account has been created. */
export function SignUpConfirmationView({
  email,
  resendStatus,
  onResend,
}: {
  email: string;
  resendStatus: ResendStatus;
  onResend: () => void;
}) {
  return (
    <AuthCard
      title="Vérifiez votre boîte mail"
      subtitle="Une dernière étape avant votre première connexion"
    >
      <div className="space-y-5">
        <InlineAlert tone="info">
          Un e-mail de confirmation a été envoyé à{" "}
          <strong className="break-all">{email}</strong>. Ouvrez-le pour activer
          votre compte.
        </InlineAlert>

        <p className="text-sm leading-relaxed text-muted">
          Le lien est valable 1 heure. Pensez à vérifier vos spams si vous ne le
          trouvez pas.
        </p>

        <ResendVerification
          status={resendStatus}
          onResend={onResend}
          sentMessage="Si un compte existe avec cette adresse, un nouvel email de vérification vient de partir."
        />

        <Button href="/signin" size="lg" className="w-full">
          Aller à la connexion
        </Button>
      </div>
    </AuthCard>
  );
}
