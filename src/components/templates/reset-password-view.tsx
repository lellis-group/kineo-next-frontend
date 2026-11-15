import { AuthForm } from "@/components/molecules/auth-form";
import { AuthScreen } from "@/components/molecules/auth-screen";
import { PasswordField } from "@/components/molecules/password-field";
import { AuthCard } from "@/components/organisms/auth-card";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-validation";

/** Which of the three screens this route is showing. */
export type ResetPasswordStage = "form" | "done" | "invalid-link";

/**
 * Pure: the stage picks the screen, and the submit handler arrives as a prop.
 */
export function ResetPasswordView({
  stage,
  error,
  onSubmit,
  onSignIn,
}: {
  stage: ResetPasswordStage;
  error: string;
  onSubmit: (formData: FormData) => Promise<void>;
  onSignIn: () => void;
}) {
  if (stage === "invalid-link") {
    return (
      <AuthCard
        title="Lien invalide"
        subtitle="Ce lien de réinitialisation est incomplet ou expiré"
      >
        <AuthScreen
          tone="warning"
          message="Demandez un nouveau lien pour choisir un nouveau mot de passe."
          actionLabel="Demander un nouveau lien"
          actionHref="/forgot-password"
        />
      </AuthCard>
    );
  }

  if (stage === "done") {
    return (
      <AuthCard
        title="Mot de passe modifié"
        subtitle="Votre nouveau mot de passe est actif"
      >
        <AuthScreen
          message="Vous pouvez dès maintenant vous connecter avec votre nouveau mot de passe."
          actionLabel="Se connecter"
          onAction={onSignIn}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe pour votre compte Kineo"
    >
      <AuthForm
        action={onSubmit}
        error={error}
        submitLabel="Enregistrer le mot de passe"
        pendingLabel="Enregistrement..."
        footer={
          <p className="text-center text-xs text-muted">
            Entre {PASSWORD_MIN_LENGTH} et {PASSWORD_MAX_LENGTH} caractères.
            Astuce : une phrase longue est plus facile à retenir qu&apos;un mot
            compliqué.
          </p>
        }
      >
        <PasswordField
          id="password"
          label="Nouveau mot de passe"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
        />

        <PasswordField
          id="confirm"
          name="confirm"
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
        />
      </AuthForm>
    </AuthCard>
  );
}
