"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { AuthCard } from "@/components/organisms/auth-card";
import type { DeletionOutcome } from "@/lib/account-deletion-service";
import { cn } from "@/lib/cn";
import { ERASURE_RETENTION_FACT } from "@/lib/delete-account-content";

export type DeletionScreenStatus = DeletionOutcome;

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

/** What the outcome can draw: the server's message, and where the flow goes. */
interface ScreenContext {
  error?: string;
  signedOut: boolean;
  hasSession: boolean;
  onRetry: () => void;
}

interface Screen {
  title: string;
  subtitle: string;
  body: (context: ScreenContext) => ReactNode;
}

/** Where a signed-out visitor goes back to; a revoked session has no profile. */
function ExitButton({ hasSession }: { hasSession: boolean }) {
  return (
    <Button
      href={hasSession ? "/profile" : "/signin"}
      variant="ghost"
      className="w-full"
    >
      {hasSession ? "Retour à mon profil" : "Se connecter"}
    </Button>
  );
}

const SPIN_COLOURS = {
  primary: "border-primary/20 border-t-primary",
  danger: "border-danger/20 border-t-danger",
} as const;

/** A page-size spinner, announced by the label it states. */
function Waiting({
  label,
  tone = "primary",
}: {
  label: string;
  tone?: keyof typeof SPIN_COLOURS;
}) {
  return (
    <div className="flex justify-center">
      <output aria-label={label}>
        <Spinner className={cn("h-8 w-8", SPIN_COLOURS[tone])} />
      </output>
    </div>
  );
}

/**
 * One screen per outcome. `already-erased` and `success` look alike, but only
 * `success` explains what was replaced and what is retained.
 */
const SCREENS: Record<DeletionOutcome, Screen> = {
  "already-erased": {
    title: "Votre compte a été anonymisé",
    subtitle: "La suppression a déjà été effectuée",
    body: ({ error }) => (
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
    ),
  },

  "no-pending-request": {
    title: "Suppression impossible",
    subtitle: "Aucune demande à traiter pour ce lien",
    body: ({ error }) => (
      <div className="space-y-6 text-center">
        <InlineAlert tone="warning">{error}</InlineAlert>

        <Button href="/profile" size="lg" className="w-full">
          Relancer une demande
        </Button>
      </div>
    ),
  },

  // Retrying this link cannot help; only a fresh request can.
  "rate-limited": {
    title: "Suppression impossible",
    subtitle: "Vos données n'ont pas été modifiées",
    body: ({ error, hasSession }) => (
      <div className="space-y-6 text-center">
        <InlineAlert as="p" tone="danger" className="text-center">
          {error}
        </InlineAlert>

        {/* The token is still unspent, but a rate limit has to wait. */}
        <Button size="lg" className="w-full" disabled>
          Réessayer
        </Button>

        <ExitButton hasSession={hasSession} />
      </div>
    ),
  },

  error: {
    title: "Suppression impossible",
    subtitle: "Vos données n'ont pas été modifiées",
    body: ({ error, hasSession, onRetry }) => (
      <div className="space-y-6 text-center">
        <InlineAlert as="p" tone="danger" className="text-center">
          {error}
        </InlineAlert>

        <Button size="lg" className="w-full" onClick={onRetry}>
          Réessayer
        </Button>

        <ExitButton hasSession={hasSession} />
      </div>
    ),
  },

  invalid: {
    title: "Lien invalide",
    subtitle: "Ce lien de suppression n'est plus valable",
    body: ({ error, hasSession }) => (
      <div className="space-y-6 text-center">
        {error && (
          <InlineAlert as="p" tone="warning" className="text-center">
            {error}
          </InlineAlert>
        )}

        <Button
          href={hasSession ? "/profile" : "/signin"}
          size="lg"
          className="w-full"
        >
          {hasSession ? "Retour à mon profil" : "Se connecter"}
        </Button>
      </div>
    ),
  },

  success: {
    title: "Votre compte a été anonymisé",
    subtitle: "Vos données personnelles ne sont plus identifiables",
    body: ({ signedOut }) => (
      <div className="space-y-6">
        <InlineAlert tone="info">
          Votre nom, votre adresse e-mail, votre numéro RPPS, votre
          localisation, vos annonces et vos messages ont été remplacés
          immédiatement. Votre compte est déconnecté partout. Merci d'avoir
          utilisé Kineo.
        </InlineAlert>

        <p className="text-sm leading-relaxed text-muted">
          Les enregistrements restants sont définitivement effacés au terme d'un
          délai de grâce. Vous pouvez recréer un compte avec cette adresse
          e-mail dès maintenant.
        </p>

        <p className="mt-3 text-center text-xs leading-relaxed text-muted">
          Conformément à notre{" "}
          <Link
            href="/privacy"
            className="underline transition-colors hover:text-primary"
          >
            politique de confidentialité
          </Link>
          , la trace de votre demande est conservée pendant une durée limitée à
          des fins de preuve. Elle ne contient ni votre nom ni votre adresse
          e-mail : {ERASURE_RETENTION_FACT}.
        </p>

        {signedOut ? (
          <Button href="/signup" size="lg" className="w-full">
            Créer un nouveau compte
          </Button>
        ) : (
          <Waiting label="Déconnexion en cours" />
        )}
      </div>
    ),
  },

  deleting: {
    title: "Suppression en cours",
    subtitle: "Nous anonymisons les données de votre compte",
    body: () => <Waiting tone="danger" label="Suppression en cours" />,
  },
};

/** The erasure confirmation's terminal screens, one per outcome. */
export function DeletionScreen({
  status,
  error,
  signedOut,
  hasSession,
  onRetry,
  headingRef,
}: DeletionScreenProps) {
  const screen = SCREENS[status];

  return (
    <AuthCard
      headingRef={headingRef}
      title={screen.title}
      subtitle={screen.subtitle}
    >
      {screen.body({ error, signedOut, hasSession, onRetry })}
    </AuthCard>
  );
}
