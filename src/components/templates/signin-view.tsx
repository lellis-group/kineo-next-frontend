import Link from "next/link";
import { AuthForm } from "@/components/molecules/auth-form";
import { AuthPageFooter } from "@/components/molecules/auth-page-footer";
import { EmailField } from "@/components/molecules/email-field";
import { PasswordField } from "@/components/molecules/password-field";
import { AuthCard } from "@/components/organisms/auth-card";
import { PASSWORD_MAX_LENGTH } from "@/lib/auth-validation";

/** The sign-in form; handlers arrive as props. */
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
      <AuthForm
        action={onSubmit}
        error={error}
        submitLabel="Se connecter"
        pendingLabel="Connexion en cours..."
      >
        <EmailField />

        <PasswordField
          id="password"
          autoComplete="current-password"
          maxLength={PASSWORD_MAX_LENGTH}
          action={
            <Link
              href="/forgot-password"
              className="text-xs text-muted transition-colors hover:text-primary"
            >
              Oublié ?
            </Link>
          }
        />
      </AuthForm>

      <AuthPageFooter
        lead="Nouveau sur Kineo ?"
        actionLabel="Créer un compte"
        actionHref="/signup"
      />
    </AuthCard>
  );
}
