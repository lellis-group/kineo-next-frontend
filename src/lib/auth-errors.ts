import { classifyError, neverReached } from "@/lib/api-errors";
import {
  EMAIL_ERROR_MESSAGE,
  NAME_ERROR_MESSAGE,
  PASSWORD_LENGTH_MESSAGE,
} from "@/lib/auth-validation";

/**
 * Auth error handling — user-friendly French messages for the auth flows
 * (signin, signup, password reset, email verification).
 *
 * Two things worth separating, because they answer different questions:
 *
 *  - *What kind of failure was this?* That is `api-errors.ts`'s job, and this
 *    module asks it rather than re-deciding. It used to carry its own
 *    `!status || status >= 500` rule, which quietly disagreed with the main
 *    classifier — a status-less failure was "unavailable" here and
 *    `service-down` there — so the same outage could be described two ways
 *    depending on which screen hit it first.
 *  - *What does better-auth actually say?* That stays here, because better-auth
 *    answers with string `code`s (`EMAIL_NOT_VERIFIED`, `USER_ALREADY_EXISTS`…)
 *    rather than HTTP statuses, and those codes are specific to the auth
 *    endpoints.
 *
 * On `message` matching, which `api-errors.ts` otherwise forbids: a `code` is
 * always tried first, and the `message` check is the fallback for a backend one
 * deploy behind that still answers with the older code inside the text. This is
 * the same rolling-deploy concession `lib/listings/service.ts` documents for
 * its status regex — deliberate, and kept as long as both backends can be
 * deployed independently. Nothing here matches on a *rendered* sentence.
 */

/** Server outage / network cut — shared copy across the auth pages. */
export const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  "Service d'authentification indisponible. Veuillez réessayer dans quelques instants.";

/**
 * The same outage, from a call that *threw* instead of returning an error object.
 *
 * Distinct from `AUTH_SERVICE_UNAVAILABLE_MESSAGE` above, which is what
 * `mapNetworkSignInError` returns. Two sentences for one situation is a smell
 * worth settling on purpose rather than by accident — but they are not obviously
 * interchangeable: this one is written for a reader who is mid-form and does not
 * know the auth service exists, so it names what they can act on ("votre
 * connexion") instead of naming a subsystem. Left as-is, and now a constant
 * rather than three literals that could drift.
 */
export const AUTH_UNREACHABLE_MESSAGE =
  "Impossible de contacter le serveur. Réessayez plus tard.";

/**
 * Whether this is worth retrying later rather than something the reader did
 * wrong: the service is down, or the connection never completed.
 *
 * Delegates the 5xx threshold to `api-errors.ts`, and asks separately whether
 * anything was ever received — the auth client resolves with a status-less
 * object when the network drops, which the main classifier has no way to
 * recognise on its own.
 */
export function isAuthServiceUnavailable(error: { status?: number }): boolean {
  if (neverReached(error)) return true;
  const kind = classifyError(error);
  return kind === "unavailable" || kind === "service-down";
}

/** Shown when the account exists but the email hasn't been verified. */
const EMAIL_NOT_VERIFIED_MESSAGE =
  "Adresse e-mail non vérifiée. Consultez votre boîte de réception et cliquez sur le lien de vérification pour activer votre compte.";

/** Maps a better-auth sign-in error to a user-friendly French message. Checks `error.code` first, then `error.message`. */
export function mapSignInError(error: {
  code?: string;
  message?: string;
}): string {
  const code = error.code?.toUpperCase();
  const message = error.message?.toUpperCase() || "";

  if (
    code === "EMAIL_NOT_VERIFIED" ||
    message.includes("EMAIL NOT VERIFIED") ||
    message.includes("EMAIL_NOT_VERIFIED")
  ) {
    return EMAIL_NOT_VERIFIED_MESSAGE;
  }

  if (
    code === "INVALID_EMAIL_OR_PASSWORD" ||
    message.includes("INVALID EMAIL OR PASSWORD")
  ) {
    return "E-mail ou mot de passe incorrect. Vérifiez votre saisie, puis réessayez.";
  }

  return "Connexion impossible pour le moment. Vérifiez votre connexion, puis réessayez.";
}

/** Maps a thrown sign-in error (network/proxy) — the raw message may still carry the verification hint. */
export function mapNetworkSignInError(error: unknown): string {
  const message = error instanceof Error ? error.message?.toUpperCase() : "";
  if (
    message.includes("EMAIL NOT VERIFIED") ||
    message.includes("EMAIL_NOT_VERIFIED")
  ) {
    return EMAIL_NOT_VERIFIED_MESSAGE;
  }
  return AUTH_SERVICE_UNAVAILABLE_MESSAGE;
}

export interface SignUpErrorMapping {
  /** Whether an account already exists for this email (drives the "sign in instead" link). */
  existingAccount: boolean;
  message: string;
}

/** Maps a better-auth sign-up error; flags pre-existing accounts so the page can propose signing in. */
export function mapSignUpError(error: {
  code?: string;
  message?: string;
}): SignUpErrorMapping {
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toUpperCase();

  // better-auth 1.7: duplicate email is `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`
  // (single caller may also receive older `USER_ALREADY_EXISTS` / `EMAIL_ALREADY_EXISTS`).
  if (
    code.includes("USER_ALREADY_EXISTS") ||
    code === "EMAIL_ALREADY_EXISTS" ||
    message.includes("already exists") ||
    message.includes("user exists")
  ) {
    return {
      existingAccount: true,
      message:
        "Un compte existe déjà avec cet e-mail. Vous pouvez vous connecter directement.",
    };
  }

  // Backend `before`-hook validation messages pass straight through.
  if (
    message.includes("8 et 128 caractères") ||
    message.includes("too short") ||
    message.includes("too long")
  ) {
    return { existingAccount: false, message: PASSWORD_LENGTH_MESSAGE };
  }
  if (message.includes("nom contient des caractères non autorisés")) {
    return { existingAccount: false, message: NAME_ERROR_MESSAGE };
  }
  if (message.includes("adresse e-mail invalide")) {
    return { existingAccount: false, message: EMAIL_ERROR_MESSAGE };
  }

  return {
    existingAccount: false,
    message:
      "Inscription impossible pour le moment. Vérifiez votre connexion, puis réessayez.",
  };
}

/** Maps a better-auth reset-password error to a user-friendly French message. */
export function mapResetPasswordError(error: { message?: string }): string {
  const message = (error.message ?? "").toUpperCase();

  if (
    message.includes("INVALID_TOKEN") ||
    message.includes("INVALID VERIFICATION TOKEN") ||
    message.includes("INVALID_RESET_PASSWORD_TOKEN")
  ) {
    return "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.";
  }
  if (
    message.includes("8 ET 128 CARACTÈRES") ||
    message.includes("TOO_SHORT") ||
    message.includes("TOO_LONG")
  ) {
    return PASSWORD_LENGTH_MESSAGE;
  }
  return "Modification impossible. Vérifiez votre connexion, puis réessayez.";
}

/** Maps a better-auth verification error to a user-friendly French message. Checks `error.code` first, then `error.message`. */
export function mapVerificationError(error: {
  code?: string | null;
  message?: string | null;
  status?: number;
}): string {
  const code = (error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toUpperCase();

  if (code === "TOKEN_EXPIRED" || message.includes("TOKEN_EXPIRED")) {
    return "Ce lien de vérification a expiré. Demandez un nouvel email ci-dessous.";
  }

  if (code === "INVALID_TOKEN" || message.includes("INVALID_TOKEN")) {
    return "Ce lien de vérification est invalide ou a déjà été utilisé.";
  }

  if (code === "USER_NOT_FOUND" || message.includes("USER_NOT_FOUND")) {
    return "Aucun compte ne correspond à ce lien de vérification.";
  }

  if (isAuthServiceUnavailable(error)) {
    return AUTH_SERVICE_UNAVAILABLE_MESSAGE;
  }

  return "Vérification impossible pour le moment. Réessayez ou demandez un nouvel email.";
}
