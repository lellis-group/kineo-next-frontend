"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { LoadingState } from "@/components/molecules/loading-state";
import { ResendVerification } from "@/components/molecules/resend-verification";
import { AuthCard } from "@/components/organisms/auth-card";
import { checkAlreadyVerified, verifyEmail } from "@/lib/auth-client";
import { mapVerificationError } from "@/lib/auth-errors";
import { useResendVerification } from "@/lib/use-resend-verification";

type VerificationStatus = "verifying" | "success" | "error" | "invalid";

/** Shape of the fallback error used when the server can't be reached. */
type AuthError = Parameters<typeof mapVerificationError>[0];

/** Accepts only an internal path (single leading "/") to prevent open redirects. */
function safeCallbackURL(raw: string | null): string {
  if (raw?.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackURL = safeCallbackURL(searchParams.get("callbackURL"));
  const email = searchParams.get("email");
  const [status, setStatus] = useState<VerificationStatus>(
    token ? "verifying" : "invalid",
  );
  const [verifyError, setVerifyError] = useState("");
  const { status: resend, resend: resendEmail } = useResendVerification(email);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    (async () => {
      const { error } = await verifyEmail({ query: { token } }).catch(
        (): { error: AuthError } => ({ error: { status: 0 } }),
      );

      if (cancelled) {
        return;
      }

      if (!error) {
        setStatus("success");
        return;
      }

      // Expired or consumed link: if the email is already verified, show success instead of an error.
      if (await checkAlreadyVerified(token)) {
        if (!cancelled) {
          setStatus("success");
        }
        return;
      }

      if (cancelled) {
        return;
      }

      setStatus("error");
      setVerifyError(mapVerificationError(error));
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "invalid" || status === "error") {
    return (
      <AuthCard
        title={status === "error" ? "Vérification impossible" : "Lien invalide"}
        subtitle={
          status === "error"
            ? "Nous n'avons pas pu valider votre adresse e-mail"
            : "Ce lien de vérification est incomplet"
        }
      >
        <div className="space-y-6 text-center">
          <p className="text-sm leading-relaxed text-muted">
            {status === "error"
              ? verifyError
              : "Connectez-vous pour recevoir un nouveau lien de vérification si votre adresse n'est pas encore validée."}
          </p>

          <ResendVerification
            status={resend}
            onResend={resendEmail}
            sentMessage="Si un compte existe avec cette adresse, un nouvel email de vérification vient de partir. Pensez à vérifier vos spams."
          />

          <Button href="/signin" size="lg" className="w-full">
            Se connecter
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "success") {
    return (
      <AuthCard
        title="Adresse e-mail vérifiée"
        subtitle="Votre compte est désormais actif"
      >
        <div className="space-y-6">
          <InlineAlert tone="info">
            Vous êtes connecté. Vous pouvez accéder à votre espace dès
            maintenant.
          </InlineAlert>

          <Button
            onClick={() => {
              router.push(callbackURL);
              router.refresh();
            }}
            size="lg"
            className="w-full"
          >
            Continuer
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Vérification en cours"
      subtitle="Nous validons votre adresse e-mail"
    >
      <div className="flex justify-center">
        <output aria-label="Vérification en cours">
          <Spinner className="h-8 w-8 border-primary/20 border-t-primary" />
        </output>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState className="min-h-dvh bg-background" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
