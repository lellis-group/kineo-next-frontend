import { classifyError, neverReached } from "@/lib/api-errors";
import {
  EMAIL_ERROR_MESSAGE,
  NAME_ERROR_MESSAGE,
  PASSWORD_LENGTH_MESSAGE,
} from "@/lib/auth-validation";

/**
 * French messages for the auth flows (signin, signup, password reset, email
 * verification). The failure *kind* is asked of `api-errors.ts`; this module
 * reads better-auth's own string `code`s.
 *
 * `message` matching is only a fallback after the code, for a backend one
 * deploy behind that still carries the code inside the text.
 */

/** Server outage / network cut — shared copy across the auth pages. */
export const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  "Service d'authentification indisponible. Veuillez réessayer dans quelques instants.";

/**
 * The same outage, from a call that *threw*. Worded for a reader who does not
 * know the auth service exists: it names their connection instead.
 */
export const AUTH_UNREACHABLE_MESSAGE =
  "Impossible de contacter le serveur. Réessayez plus tard.";

/** "The call did not get through", with the action's verb swapped in. */
export function authCallFailed(action: string): string {
  return `${action} impossible pour le moment. Vérifiez votre connexion, puis réessayez.`;
}

/**
 * Whether this is worth retrying later: the service is down, or the connection
 * never completed (the auth client then resolves with a status-less object).
 */
export function isAuthServiceUnavailable(error: { status?: number }): boolean {
  if (neverReached(error)) return true;
  const kind = classifyError(error);
  return kind === "unavailable" || kind === "service-down";
}

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

  return authCallFailed("Connexion");
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

  // better-auth 1.7 answers `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`; older
  // codes are kept.
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

  // Matched on the code, never on the backend's English copy. The password
  // codes come from our `before` hook or from better-auth's own length check.
  if (
    code === "PASSWORD_TOO_SHORT_OR_LONG" ||
    code === "PASSWORD_TOO_SHORT" ||
    code === "PASSWORD_TOO_LONG" ||
    code === "INVALID_PASSWORD"
  ) {
    return { existingAccount: false, message: PASSWORD_LENGTH_MESSAGE };
  }
  if (code === "INVALID_NAME") {
    return { existingAccount: false, message: NAME_ERROR_MESSAGE };
  }

  // An invalid email has no code of its own: better-auth's zod layer answers
  // `VALIDATION_ERROR` for any field, but names it in a `[body.<field>]` prefix.
  if (code === "VALIDATION_ERROR" && message.includes("[body.email]")) {
    return { existingAccount: false, message: EMAIL_ERROR_MESSAGE };
  }

  return {
    existingAccount: false,
    message: authCallFailed("Inscription"),
  };
}

/** Whether this instance has password reset switched off. */
export function isPasswordResetDisabled(failure: {
  code?: string | null;
  message?: string | null;
}): boolean {
  const code = failure.code ?? "";
  const message = (failure.message ?? "").toLowerCase();
  return (
    code === "RESET_PASSWORD_DISABLED" ||
    message.includes("isn't enabled") ||
    message.includes("not enabled")
  );
}

/** Maps a better-auth reset-password error to a user-friendly French message. */
export function mapResetPasswordError(error: {
  code?: string | null;
  message?: string | null;
}): string {
  const code = (error.code ?? "").toUpperCase();
  const message = (error.message ?? "").toUpperCase();

  if (
    code === "INVALID_TOKEN" ||
    code === "INVALID_RESET_PASSWORD_TOKEN" ||
    message.includes("INVALID_TOKEN") ||
    message.includes("INVALID VERIFICATION TOKEN") ||
    message.includes("INVALID_RESET_PASSWORD_TOKEN")
  ) {
    return "Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.";
  }
  if (
    code === "PASSWORD_TOO_SHORT_OR_LONG" ||
    code === "PASSWORD_TOO_SHORT" ||
    code === "PASSWORD_TOO_LONG" ||
    code === "INVALID_PASSWORD" ||
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
