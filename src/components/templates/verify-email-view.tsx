import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";
import { AuthScreen } from "@/components/molecules/auth-screen";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { ResendVerification } from "@/components/molecules/resend-verification";
import { AuthCard } from "@/components/organisms/auth-card";
import type { ResendStatus } from "@/lib/use-resend-verification";

export type VerificationStage = "verifying" | "success" | "error" | "invalid";

/**
 * What the link is for, as the backend labelled it.
 *
 * The backend reads the flow off the token and puts it in the query string: a
 * change of address and a sign-up share this page and nothing else on it.
 */
export type VerificationFlow = "change-email";

export function isAddressChangeFlow(
  flow: string | null | undefined,
): flow is VerificationFlow {
  return flow === "change-email";
}

/**
 * Pure: the stage picks the screen, and the callbacks arrive as props.
 *
 * `error` and `invalid` share a layout but not a meaning — one is a link that
 * could not be validated at all, the other is a verification that was attempted
 * and refused — so they are separate stages rather than one stage with a flag.
 * Both offer a resend on a sign-up link, because both leave the reader needing
 * the same next step.
 *
 * `flow` says what the link was for. It matters twice: the success screen cannot
 * claim a brand new account is now active when the reader only changed their
 * address, and a resend cannot help — `sendVerificationEmail` re-issues a
 * *sign-up* link, which for a change verifies the address without ever applying
 * the pending one. So on `change-email` the resend is replaced by the way out.
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
  /** Sentence for the `error` stage. Unused on the others. */
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
            size="lg"
            className="w-full"
          >
            {isAddressChange ? "Aller à mon profil" : "Se connecter"}
          </Button>
        </div>
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
      {/* Not `LoadingState`: that reserves half the viewport, which is right for
          a page but wrong inside a card that already fills one — the box would
          be taller than the card around it. Same rule as the spinners in
          `deletion-screen`. The label names the step rather than "Chargement",
          since the reader is waiting on a server round trip. */}
      <div className="flex justify-center">
        <output aria-label="Vérification en cours">
          <Spinner className="h-8 w-8 border-primary/20 border-t-primary" />
        </output>
      </div>
    </AuthCard>
  );
}
