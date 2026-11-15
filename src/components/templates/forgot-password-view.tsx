import Link from "next/link";
import { AuthForm } from "@/components/molecules/auth-form";
import { AuthScreen } from "@/components/molecules/auth-screen";
import { EmailField } from "@/components/molecules/email-field";
import { AuthCard } from "@/components/organisms/auth-card";

/** Which of the three screens this route is showing. */
export type ForgotPasswordStage = "form" | "sent" | "not-enabled";

/**
 * Pure: the stage picks the screen, and the submit handler arrives as a prop.
 */
export function ForgotPasswordView({
  stage,
  error,
  onSubmit,
}: {
  stage: ForgotPasswordStage;
  error: string;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const card = {
    title: "Mot de passe oublié",
    subtitle:
      "Nous vous enverrons un lien pour choisir un nouveau mot de passe",
  };

  if (stage === "sent") {
    return (
      <AuthCard title={card.title} subtitle={card.subtitle}>
        <AuthScreen
          message={
            <>
              Si un compte existe avec cet e-mail, vous recevrez un lien de
              réinitialisation dans quelques instants.
              <br />
              Pensez à vérifier votre dossier spam.
            </>
          }
          actionLabel="Retour à la connexion"
          actionHref="/signin"
        />
      </AuthCard>
    );
  }

  if (stage === "not-enabled") {
    return (
      <AuthCard title={card.title} subtitle={card.subtitle}>
        <AuthScreen
          tone="warning"
          message="La réinitialisation en ligne n'est pas encore activée. Contactez l'administrateur de votre structure pour réinitialiser votre mot de passe."
          actionLabel="Retour à la connexion"
          actionHref="/signin"
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={card.title} subtitle={card.subtitle}>
      <AuthForm
        action={onSubmit}
        error={error}
        submitLabel="Recevoir le lien"
        pendingLabel="Envoi du lien..."
      >
        <EmailField id="email" />
      </AuthForm>

      <p className="mt-6 text-center text-sm text-muted">
        Mot de passe retrouvé ?{" "}
        <Link
          href="/signin"
          className="font-medium text-primary transition-colors hover:text-primary-hover"
        >
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
