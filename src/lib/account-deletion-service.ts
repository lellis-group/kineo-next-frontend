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

/**
 * Why a confirmation did not go through.
 *
 * `blocked` is the only recoverable one: the account is untouched, the token
 * survives the rollback, and the user can act (close or cancel the listings
 * holding other candidates' applications) then replay the same link.
 */
export type DeletionFailure =
  | "blocked"
  | "expired"
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
    // 409: other candidates still hold active applications on this account's
    // listings, and the cascade would destroy their data. The backend answers
    // in English here, so the French copy is owned by the frontend instead of
    // being taken from `apiMessage`.
    if (error.status === 409) {
      return {
        failure: "blocked",
        message:
          "Vos annonces reçoivent encore des candidatures actives d'autres candidats. Fermez ou annulez ces annonces, puis rouvrez ce lien : votre compte n'a pas été modifié.",
      };
    }
    if (error.status === 410) {
      return {
        failure: "expired",
        message:
          error.apiMessage ??
          "Ce lien de confirmation a expiré (valable 24 heures). Relancez la demande depuis votre profil.",
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
          "Trop de tentatives. Patientez quelques instants, puis réessayez.",
      };
    }
    if (error.status >= 500) {
      return {
        failure: "unavailable",
        message:
          "Service indisponible. Veuillez réessayer dans quelques instants.",
      };
    }
  }
  return {
    failure: "unavailable",
    message:
      "Suppression impossible pour le moment. Vérifiez votre connexion, puis réessayez.",
  };
}
