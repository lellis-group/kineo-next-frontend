"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";
import { InlineAlert } from "@/components/molecules/inline-alert";
import { LoadingState } from "@/components/molecules/loading-state";
import { AuthCard } from "@/components/organisms/auth-card";
import { ErasureBlockerResolver } from "@/components/organisms/erasure-blocker-resolver";
import {
  AccountDeletionError,
  confirmAccountDeletion,
  type DeletionFailure,
} from "@/lib/account-deletion-service";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * One member per `DeletionFailure`, plus the two in-flight states. The screen
 * is chosen from this, so every failure the service can report needs a case
 * here: a value silently falling through to a generic "impossible" screen is
 * how a retryable 429 ended up with no button to retry on it.
 */
type DeletionStatus =
  | "deleting"
  | "success"
  | "blocked"
  | "already-erased"
  | "no-pending-request"
  | "invalid"
  | "rate-limited"
  | "error";

type DeletionOutcome = {
  status: DeletionStatus;
  error?: string;
};

/**
 * One in-flight deletion job per token, shared across component remounts
 * (React StrictMode double-mounts effects in dev). The confirmation POST
 * consumes a single-use server-side token, so it must be sent exactly once: a
 * double request would anonymize the account on the first call and fail with an
 * invalid-token error on the second.
 *
 * Only successful and in-flight jobs are kept. A failure is dropped from the
 * map on purpose: nothing was consumed server-side, and the `blocked` case in
 * particular asks the user to fix their listings and come back to the very same
 * link — a cached rejection would make that impossible without a full reload.
 */
const deletionJobs = new Map<string, Promise<DeletionOutcome>>();

function requestDeletion(token: string): Promise<DeletionOutcome> {
  const existing = deletionJobs.get(token);
  if (existing) {
    return existing;
  }

  // Sessionless confirmation: the email link alone is enough, no session
  // cookie is needed (see @/lib/account-deletion-service).
  const job = confirmAccountDeletion(token).then(
    (): DeletionOutcome => ({ status: "success" }),
    (error: unknown): DeletionOutcome => {
      deletionJobs.delete(token);
      return {
        status:
          error instanceof AccountDeletionError
            ? toStatus(error.failure)
            : "error",
        error:
          error instanceof Error
            ? error.message
            : "Suppression impossible pour le moment. Vérifiez votre connexion, puis réessayez.",
      };
    },
  );

  deletionJobs.set(token, job);
  return job;
}

/** Exhaustively maps a failure onto a screen; no silent fallthrough. */
function toStatus(failure: DeletionFailure): DeletionStatus {
  switch (failure) {
    case "blocked":
      return "blocked";
    case "no-pending-request":
      return "no-pending-request";
    case "already-erased":
      return "already-erased";
    case "invalid":
      return "invalid";
    case "rate-limited":
      return "rate-limited";
    case "unavailable":
      return "error";
  }
}

function GoodbyeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session } = useSession();
  const user = session?.user;
  const [status, setStatus] = useState<DeletionStatus>(
    token ? "deleting" : "invalid",
  );
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  const applyOutcome = useCallback((outcome: DeletionOutcome) => {
    setStatus(outcome.status);
    setError(outcome.error ?? "");
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    requestDeletion(token).then((outcome) => {
      if (cancelled) {
        return;
      }
      applyOutcome(outcome);
    });

    return () => {
      cancelled = true;
    };
  }, [token, applyOutcome]);

  /**
   * Replays the confirmation. Called after the user cleared the blocker, and
   * from the retry button on the transient failures.
   *
   * Safe to call repeatedly: the failed job was evicted from `deletionJobs`, and
   * a refused confirmation rolls back without consuming the token, so the
   * single-use credential is still there.
   */
  const retryConfirmation = useCallback(() => {
    if (!token) {
      return;
    }

    setStatus("deleting");
    setError("");

    requestDeletion(token).then(applyOutcome);
  }, [token, applyOutcome]);

  // The sessionless confirm-deletion endpoint wipes sessions server-side but
  // can't clear browser cookies (no Set-Cookie on its response). Sign out to
  // drop the ghost cookie + the cookie-cache JWT; it always clears cookies
  // even when the session row is already gone. Never blocks the screen:
  // failure just leaves the button to /signup, which is public anyway.
  //
  // Only on success: a `blocked` outcome left the account fully intact, so
  // signing the user out would lock them out of the listings they must fix.
  useEffect(() => {
    if (status !== "success") {
      return;
    }

    let cancelled = false;

    signOut()
      .catch(() => {
        // Cookie cleanup best-effort — the account is already anonymized.
      })
      .finally(() => {
        if (!cancelled) {
          setSignedOut(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  // Refused, but the account is untouched and the token still valid: the only
  // way out is to clear the applications held by other candidates, so this is
  // the one failure that gets its own screen instead of a generic error.
  if (status === "blocked") {
    return (
      <AuthCard
        title="Suppression refusée"
        subtitle="D'autres candidats occupent encore vos annonces"
      >
        <div className="space-y-6">
          <InlineAlert tone="warning">{error}</InlineAlert>

          <p className="text-center text-sm leading-relaxed text-muted">
            Fermer ou annuler une annonce termine automatiquement les
            candidatures qu&apos;elle recevait. Vos données et votre compte
            restent inchangés tant que ce n&apos;est pas fait.
          </p>

          <ErasureBlockerResolver onResolved={retryConfirmation} />

          <div className="space-y-3">
            <Button href="/listings/mine" variant="outline" className="w-full">
              Voir toutes mes annonces
            </Button>
            <Button
              href={user ? "/profile" : "/signin"}
              variant="ghost"
              className="w-full"
            >
              {user ? "Retour à mon profil" : "Se connecter"}
            </Button>
          </div>
        </div>
      </AuthCard>
    );
  }

  // The erasure already ran. Not a failure, and no link back to a profile: the
  // account was revoked, so the session this page would send them to is gone.
  if (status === "already-erased") {
    return (
      <AuthCard
        title="Votre compte a été anonymisé"
        subtitle="La suppression a déjà été effectuée"
      >
        <div className="space-y-6 text-center">
          <InlineAlert tone="success">{error}</InlineAlert>

          <p className="text-sm leading-relaxed text-muted">
            Ce lien ne peut être utilisé qu&apos;une fois. Vous pouvez recréer
            un compte avec la même adresse e-mail.
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
        title="Suppression impossible"
        subtitle="Vos données n'ont pas été modifiées"
      >
        <div className="space-y-6 text-center">
          <InlineAlert as="p" tone="danger" className="text-center">
            {error}
          </InlineAlert>

          {/* Retrying is the only useful action: nothing was consumed
              server-side, so the token is still valid and unspent. */}
          <Button
            size="lg"
            className="w-full"
            onClick={retryConfirmation}
            disabled={status === "rate-limited"}
          >
            Réessayer
          </Button>

          <Button
            href={user ? "/profile" : "/signin"}
            variant="ghost"
            className="w-full"
          >
            {user ? "Retour à mon profil" : "Se connecter"}
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "invalid") {
    return (
      <AuthCard
        title="Lien invalide"
        subtitle="Ce lien de suppression n'est plus valable"
      >
        <div className="space-y-6 text-center">
          <InlineAlert as="p" tone="warning" className="text-center">
            {error}
          </InlineAlert>

          <Button
            href={user ? "/profile" : "/signin"}
            size="lg"
            className="w-full"
          >
            {user ? "Retour à mon profil" : "Se connecter"}
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === "success") {
    return (
      <AuthCard
        title="Votre compte a été anonymisé"
        subtitle="Vos données personnelles ne sont plus identifiables"
      >
        <div className="space-y-6">
          <InlineAlert tone="info">
            Votre nom, votre adresse e-mail, votre numéro RPPS, votre
            localisation, vos annonces et vos messages ont été remplacés
            immédiatement. Votre compte est déconnecté partout. Merci
            d&apos;avoir utilisé Kineo.
          </InlineAlert>

          <p className="text-sm leading-relaxed text-muted">
            Les enregistrements restants sont définitivement effacés au terme
            d&apos;un délai de grâce. Vous pouvez recréer un compte avec cette
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
            e-mail, seulement des empreintes non réversibles et les dates.
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

export default function GoodbyePage() {
  return (
    <Suspense fallback={<LoadingState className="min-h-dvh bg-background" />}>
      <GoodbyeContent />
    </Suspense>
  );
}
