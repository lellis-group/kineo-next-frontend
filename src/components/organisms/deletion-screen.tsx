"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { AuthCard } from "@/components/organisms/auth-card";
import type { DeletionOutcome } from "@/lib/account-deletion-service";
import { ERASURE_RETENTION_FACT } from "@/lib/delete-account-content";

export type DeletionScreenStatus = DeletionOutcome;

/**
 * One screen per outcome of the account-erasure confirmation.
 *
 * Kept apart from the flow that drives them: `useDeletionConfirmation` owns the
 * request, the job cache and the sign-out, while this file is only the wording
 * and the actions. The screens share a shell and almost nothing else, so the
 * thing worth protecting is the mapping from an outcome to a screen — which lives
 * with the flow and is exhaustive rather than a chain of conditionals: a failure
 * the service can report but that map does not cover would otherwise fall through
 * to a generic screen, which is how a retryable 429 once ended up with no retry
 * button on it.
 *
 * `already-erased` and `success` read alike — same title, same « recréer un
 * compte » button — but they are not one screen: the first is reached because the
 * link was already used and the session may never have been cleared, and it says
 * so in one line, while the second is the only place that explains what was
 * replaced, when the rows are really gone, and what the 365-day trace holds. Two
 * paragraphs and a policy link between them is more than a conditional.
 */

export interface DeletionScreenProps {
  status: DeletionScreenStatus;
  /** Service-supplied wording for the failure, when there is one. */
  error?: string;
  /** True once the browser session has been cleared after a success. */
  signedOut: boolean;
  /** Whether a session is still present — decides profile vs sign-in. */
  hasSession: boolean;
  onRetry: () => void;
  /** Focused when the screen settles — see `AuthCard`. */
  headingRef: RefObject<HTMLHeadingElement | null>;
}

function exitHref(hasSession: boolean) {
  return hasSession ? "/profile" : "/signin";
}

function exitLabel(hasSession: boolean) {
  return hasSession ? "Retour à mon profil" : "Se connecter";
}

export function DeletionScreen({
  status,
  error,
  signedOut,
  hasSession,
  onRetry,
  headingRef,
}: DeletionScreenProps) {
  // The erasure already ran. Not a failure, and no link back to a profile: the
  // account was revoked, so the session this page would send them to is gone.
  if (status === "already-erased") {
    return (
      <AuthCard
        headingRef={headingRef}
        title="Votre compte a été anonymisé"
        subtitle="La suppression a déjà été effectuée"
      >
        <div className="space-y-6 text-center">
          <InlineAlert tone="success">{error}</InlineAlert>

          <p className="text-sm leading-relaxed text-muted">
            Ce lien ne peut être utilisé qu'une fois. Vous pouvez recréer un
            compte avec la même adresse e-mail.
          </p>

          <Button href="/signup" size="lg" className="w-full">
            Créer un nouveau compte
          </Button>
        </div>
      </AuthCard>
    );
  }

  // Conflict with nothing in the way: no listing to close, and retrying this
  // link cannot help. The only way forward is a fresh request.
  if (status === "no-pending-request") {
    return (
      <AuthCard
        headingRef={headingRef}
        title="Suppression impossible"
        subtitle="Aucune demande à traiter pour ce lien"
      >
        <div className="space-y-6 text-center">
          <InlineAlert tone="warning">{error}</InlineAlert>

          <Button href="/profile" size="lg" className="w-full">
            Relancer une demande
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "rate-limited" || status === "error") {
    return (
      <AuthCard
        headingRef={headingRef}
        title="Suppression impossible"
        subtitle="Vos données n'ont pas été modifiées"
      >
        <div className="space-y-6 text-center">
          <InlineAlert as="p" tone="danger" className="text-center">
            {error}
          </InlineAlert>

          {/* Retrying is the only useful action: nothing was consumed
            server-side, so the token is still valid and unspent. Disabled on a
            rate limit, where the server asked for a wait it has not reported. */}
          <Button
            size="lg"
            className="w-full"
            onClick={onRetry}
            disabled={status === "rate-limited"}
          >
            Réessayer
          </Button>

          <Button
            href={exitHref(hasSession)}
            variant="ghost"
            className="w-full"
          >
            {exitLabel(hasSession)}
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "invalid") {
    return (
      <AuthCard
        headingRef={headingRef}
        title="Lien invalide"
        subtitle="Ce lien de suppression n'est plus valable"
      >
        <div className="space-y-6 text-center">
          <InlineAlert as="p" tone="warning" className="text-center">
            {error}
          </InlineAlert>

          <Button href={exitHref(hasSession)} size="lg" className="w-full">
            {exitLabel(hasSession)}
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "success") {
    return (
      <AuthCard
        headingRef={headingRef}
        title="Votre compte a été anonymisé"
        subtitle="Vos données personnelles ne sont plus identifiables"
      >
        <div className="space-y-6">
          <InlineAlert tone="info">
            Votre nom, votre adresse e-mail, votre numéro RPPS, votre
            localisation, vos annonces et vos messages ont été remplacés
            immédiatement. Votre compte est déconnecté partout. Merci d'avoir
            utilisé Kineo.
          </InlineAlert>

          <p className="text-sm leading-relaxed text-muted">
            Les enregistrements restants sont définitivement effacés au terme
            d'un délai de grâce. Vous pouvez recréer un compte avec cette
            adresse e-mail dès maintenant.
          </p>

          <p className="mt-3 text-center text-xs leading-relaxed text-muted">
            Conformément à notre{" "}
            <Link
              href="/privacy"
              className="underline transition-colors hover:text-primary"
            >
              politique de confidentialité
            </Link>
            , la trace de votre demande est conservée pendant une durée limitée
            à des fins de preuve. Elle ne contient ni votre nom ni votre adresse
            e-mail : {ERASURE_RETENTION_FACT}.
          </p>

          {!signedOut ? (
            <div className="flex justify-center">
              <output aria-label="Déconnexion en cours">
                <Spinner className="h-8 w-8 border-primary/20 border-t-primary" />
              </output>
            </div>
          ) : (
            <Button href="/signup" size="lg" className="w-full">
              Créer un nouveau compte
            </Button>
          )}
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      headingRef={headingRef}
      title="Suppression en cours"
      subtitle="Nous anonymisons les données de votre compte"
    >
      <div className="flex justify-center">
        <output aria-label="Suppression en cours">
          <Spinner className="h-8 w-8 border-danger/20 border-t-danger" />
        </output>
      </div>
    </AuthCard>
  );
}
