import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";
import { AuthScreen } from "@/components/molecules/auth-screen";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { ResendVerification } from "@/components/molecules/resend-verification";
import { AuthCard } from "@/components/organisms/auth-card";
import type { ResendStatus } from "@/lib/hooks/use-resend-verification";

import type { VerificationFlow } from "@/lib/verification-flow";
import { isAddressChangeFlow, isApprovalFlow } from "@/lib/verification-flow";

export type VerificationStage = "verifying" | "success" | "error" | "invalid";

/**
 * Pure: the stage picks the screen. `flow` picks between three success
 * screens (sign-up, email change, change approval); a resend only helps a
 * sign-up link.
 */
export function VerifyEmailView({
  stage,
  flow,
  error,
  resendStatus,
  onResend,
  onContinue,
}: {
  stage: VerificationStage;
  /** What the link does when it is opened. Defaults to a sign-up. */
  flow?: VerificationFlow;
  error: string;
  resendStatus: ResendStatus;
  onResend: () => void;
  onContinue: () => void;
}) {
  const isAddressChange = isAddressChangeFlow(flow);

  if (stage === "invalid" || stage === "error") {
    const failed = stage === "error";
    return (
      <AuthCard
        title={failed ? "Vérification impossible" : "Lien invalide"}
        subtitle={
          failed
            ? "Nous n'avons pas pu valider votre adresse e-mail"
            : "Ce lien de vérification est incomplet"
        }
      >
        <div className="space-y-6 text-center">
          <p className="text-sm leading-relaxed text-muted">
            {failed
              ? error
              : "Connectez-vous pour recevoir un nouveau lien de vérification si votre adresse n'est pas encore validée."}
          </p>

          {isAddressChange ? (
            <InlineAlert tone="info">
              Ce lien a expiré ou a déjà été utilisé. Pour changer
              d&apos;adresse e-mail, demandez-en un nouveau depuis votre profil
              : le bouton ci-dessous ne ferait que renvoyer un lien de création
              de compte.
            </InlineAlert>
          ) : (
            <ResendVerification
              status={resendStatus}
              onResend={onResend}
              sentMessage="Si un compte existe avec cette adresse, un nouvel email de vérification vient de partir. Pensez à vérifier vos spams."
            />
          )}

          <Button
            href={isAddressChange ? "/profile" : "/signin"}
            variant={isAddressChange ? "primary" : "secondary"}
            size="lg"
            className="w-full"
          >
            {isAddressChange ? "Aller à mon profil" : "Se connecter"}
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (stage === "success" && isApprovalFlow(flow)) {
    return (
      <AuthCard title="Demande approuvée" subtitle="Le changement est autorisé">
        <AuthScreen
          message="Un email vient d'être envoyé à la nouvelle adresse : la personne qui la contrôle devra le confirmer pour que l'adresse change effectivement. Sans cette confirmation, rien ne change."
          actionLabel="Continuer"
          onAction={onContinue}
        />
      </AuthCard>
    );
  }

  if (stage === "success") {
    return isAddressChange ? (
      <AuthCard
        title="Adresse e-mail mise à jour"
        subtitle="Votre nouvelle adresse est confirmée"
      >
        <AuthScreen
          message="C'est désormais cette adresse qui est associée à votre compte. Les prochains emails de Kineo vous y seront envoyés."
          actionLabel="Continuer"
          onAction={onContinue}
        />
      </AuthCard>
    ) : (
      <AuthCard
        title="Adresse e-mail vérifiée"
        subtitle="Votre compte est désormais actif"
      >
        <AuthScreen
          message="Vous êtes connecté. Vous pouvez accéder à votre espace dès maintenant."
          actionLabel="Continuer"
          onAction={onContinue}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Vérification en cours"
      subtitle="Nous validons votre adresse e-mail"
    >
      {/* Not `LoadingState`, which reserves half the viewport. */}
      <div className="flex justify-center">
        <output aria-label="Vérification en cours">
          <Spinner className="h-8 w-8 border-primary/20 border-t-primary" />
        </output>
      </div>
    </AuthCard>
  );
}
