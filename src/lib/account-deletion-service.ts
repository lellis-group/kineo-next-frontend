/**
 * Account-deletion confirmation service — calls the sessionless backend
 * endpoint. The email link alone is enough: better-auth's delete-user route
 * requires an active session cookie at click time (different browser, expired
 * session or blocked cookies → false "invalid link"), while this endpoint
 * trusts the single-use `delete-account-*` token (24h) as proof of identity.
 *
 * The backend anonymizes the account instead of deleting it outright (art. 17
 * GDPR): the personal fields are overwritten and access is revoked right away,
 * then a scheduled sweep drops the rows after the grace period. Failures are
 * therefore reported as a typed reason rather than a flat message, because the
 * caller has to offer a different way out for each of them.
 */

import { ApiError, apiFetch } from "./api-client";

/** Mirrors the backend's `ERASURE_ERROR_CODES`. */
export const ERASURE_ERROR_CODES = {
  THIRD_PARTY_APPLICATIONS: "THIRD_PARTY_APPLICATIONS",
  NO_PENDING_REQUEST: "NO_PENDING_REQUEST",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  ALREADY_ERASED: "ALREADY_ERASED",
} as const;

/**
 * Why a confirmation did not go through.
 *
 * `blocked` is legacy: the backend no longer refuses an erasure over other
 * candidates' applications, it detaches them so the request can go through. It
 * survives only so a link confirmed against a backend one deploy behind still
 * produces a real French sentence rather than an empty error.
 * `no-pending-request` looks like a conflict but is not — nothing is in the way
 * and retrying cannot help. `already-erased` means the work is done, which is
 * not a failure at all. `rate-limited` and `unavailable` are transient and
 * worth retrying.
 */
export type DeletionFailure =
  | "blocked"
  | "no-pending-request"
  | "already-erased"
  | "invalid"
  | "rate-limited"
  | "unavailable";

/** A refused confirmation, carrying the reason the UI has to react to. */
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
export async function confirmAccountDeletion(token: string): Promise<void> {
  try {
    await apiFetch<{ success: boolean; message: string }>(
      "/account/confirm-deletion",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
    );
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      throw error;
    }
    const { failure, message } = mapConfirmDeletionError(error);
    throw new AccountDeletionError(failure, message);
  }
}

/** Maps a confirm-deletion API error to a reason plus a user-facing French message. */
function mapConfirmDeletionError(error: unknown): {
  failure: DeletionFailure;
  message: string;
} {
  if (error instanceof ApiError) {
    // The backend discriminates the two conflicts, so the status no longer has
    // to. The French copy stays here because these bodies are still English.
    if (error.code === ERASURE_ERROR_CODES.THIRD_PARTY_APPLICATIONS) {
      // Only reachable against a backend one deploy behind, which still
      // refuses instead of detaching. It maps to `blocked`, which the goodbye
      // screen now treats as a generic retryable error: the honest answer when
      // the server is the thing that changed is to try again.
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

    // Fallbacks for a backend that sends no discriminator: fall back on the
    // status rather than guessing from the message text.
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
    if (error.status >= 500) {
      return {
        failure: "unavailable",
        message:
          "Le service est momentanément indisponible. Vos données n'ont pas été modifiées, vous pouvez réessayer.",
      };
    }
  }
  return {
    failure: "unavailable",
    message:
      "Suppression impossible pour le moment. Vérifiez votre connexion, puis réessayez.",
  };
}

/** Backend wording for an expired 24h link, reused when no code is sent. */
const LEGACY_EXPIRED_MESSAGE =
  "Ce lien de confirmation a expiré (valable 24 heures). Relancez la demande depuis votre profil.";
