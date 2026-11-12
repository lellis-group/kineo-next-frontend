/**
 * Account-deletion confirmation: a sessionless endpoint that trusts the
 * single-use emailed token, since better-auth's delete-user route would need a
 * session cookie at click time. The backend anonymizes rather than deletes
 * (art. 17 GDPR); failures are typed because each needs a different way out.
 */

import { ApiError, type ApiTransport, apiFetch } from "./api-client";
import { classifyError } from "./api-errors";
import { authCallFailed } from "./auth-errors";

/** Mirrors the backend's `ERASURE_ERROR_CODES`. */
export const ERASURE_ERROR_CODES = {
  THIRD_PARTY_APPLICATIONS: "THIRD_PARTY_APPLICATIONS",
  NO_PENDING_REQUEST: "NO_PENDING_REQUEST",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  ALREADY_ERASED: "ALREADY_ERASED",
} as const;

/**
 * Why a confirmation did not go through — not an `ErrorKind`: these outcomes
 * get screens of their own.
 *
 * `blocked` only comes from a backend one version behind, which refused
 * erasure over other candidates' applications.
 */
export type DeletionFailure =
  | "blocked"
  | "no-pending-request"
  | "already-erased"
  | "invalid"
  | "rate-limited"
  | "unavailable";

/** Where a confirmation attempt landed, as the screen draws it. */
export type DeletionOutcome =
  | "deleting"
  | "success"
  | "already-erased"
  | "no-pending-request"
  | "invalid"
  | "rate-limited"
  | "error";

export class AccountDeletionError extends Error {
  constructor(
    readonly failure: DeletionFailure,
    message: string,
  ) {
    super(message);
    this.name = "AccountDeletionError";
  }
}

/** POST /account/confirm-deletion — confirms deletion with the email token, no session needed. */
export async function confirmAccountDeletion(
  token: string,
  transport?: ApiTransport,
): Promise<void> {
  try {
    await apiFetch<{ success: boolean; message: string }>(
      "/account/confirm-deletion",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      transport,
    );
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      throw error;
    }
    const { failure, message } = mapConfirmDeletionError(error);
    throw new AccountDeletionError(failure, message);
  }
}

function mapConfirmDeletionError(error: unknown): {
  failure: DeletionFailure;
  message: string;
} {
  if (error instanceof ApiError) {
    // The French copy stays here because the backend bodies are English.
    if (error.code === ERASURE_ERROR_CODES.THIRD_PARTY_APPLICATIONS) {
      // Only from a backend one deploy behind; treated as retryable.
      return {
        failure: "blocked",
        message:
          "La suppression n'a pas abouti : votre compte et vos données sont inchangés. Réessayez dans un instant.",
      };
    }
    if (error.code === ERASURE_ERROR_CODES.NO_PENDING_REQUEST) {
      return {
        failure: "no-pending-request",
        message:
          "Nous ne retrouvons plus de demande de suppression en attente pour ce lien. Relancez la demande depuis votre profil : elle prendra effet immédiatement.",
      };
    }
    if (error.code === ERASURE_ERROR_CODES.TOKEN_EXPIRED) {
      return { failure: "invalid", message: LEGACY_EXPIRED_MESSAGE };
    }
    if (error.code === ERASURE_ERROR_CODES.ALREADY_ERASED) {
      return {
        failure: "already-erased",
        message:
          "Ce compte a déjà été anonymisé. Il n'y a plus rien à supprimer.",
      };
    }

    // A backend that sends no discriminator: fall back on the status.
    if (error.status === 409) {
      return {
        failure: "no-pending-request",
        message:
          "Impossible de supprimer votre compte pour le moment. Relancez la demande depuis votre profil.",
      };
    }
    if (error.status === 410) {
      return {
        failure: "invalid",
        message: error.apiMessage ?? LEGACY_EXPIRED_MESSAGE,
      };
    }
    if (error.status === 404) {
      return {
        failure: "invalid",
        message:
          error.apiMessage ??
          "Ce lien de confirmation est invalide ou a déjà été utilisé. Votre compte n'a pas été supprimé ; vous pouvez relancer la demande depuis votre profil.",
      };
    }
    if (error.status === 429) {
      return {
        failure: "rate-limited",
        message:
          "Trop de tentatives depuis ce lien. Patientez une quinzaine de minutes avant de réessayer : la limite est de 5 essais par quart d'heure.",
      };
    }

    const kind = classifyError(error);
    if (kind === "unavailable" || kind === "service-down") {
      return {
        failure: "unavailable",
        message:
          "Le service est momentanément indisponible. Vos données n'ont pas été modifiées, vous pouvez réessayer.",
      };
    }
  }
  return {
    failure: "unavailable",
    message: authCallFailed("Suppression"),
  };
}

/** Backend wording for an expired 24h link, reused when no code is sent. */
const LEGACY_EXPIRED_MESSAGE =
  "Ce lien de confirmation a expiré (valable 24 heures). Relancez la demande depuis votre profil.";
