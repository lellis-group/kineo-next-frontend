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
 * One screen per outcome of the account-erasure confirmation; the flow lives
 * in `useDeletionConfirmation`. `already-erased` and `success` look alike, but
 * only `success` explains what was replaced and what is retained.
 */

export interface DeletionScreenProps {
  status: DeletionScreenStatus;
  error?: string;
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
  // No link back to a profile: the session was revoked.
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

  // Retrying this link cannot help; only a fresh request can.
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

          {/* The token is still unspent. Disabled on a rate limit. */}
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
          {error && (
            <InlineAlert as="p" tone="warning" className="text-center">
              {error}
            </InlineAlert>
          )}

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
