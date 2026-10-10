import Form from "next/form";
import Link from "next/link";
import { AuthPageFooter } from "@/components/molecules/auth-page-footer";
import { EmailField } from "@/components/molecules/email-field";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { PasswordInput } from "@/components/molecules/password-input";
import { SubmitButton } from "@/components/molecules/submit-button";
import { AuthCard } from "@/components/organisms/auth-card";
import { PASSWORD_MAX_LENGTH } from "@/lib/auth-validation";

/**
 * The sign-in form.
 *
 * Pure: every handler arrives as a prop, so this file is about what the screen
 * looks like and `signin-container` is about what happens when it is submitted.
 */
export function SignInView({
  error,
  onSubmit,
}: {
  error: string;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <AuthCard
      title="Connexion"
      subtitle="Accédez à la console de remplacement Kineo"
    >
      <Form action={onSubmit} className="flex flex-col gap-5">
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
