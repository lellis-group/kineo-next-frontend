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
 * deployed independently.
 *
 * Nothing here matches on a *rendered sentence*. The one place a message is
 * read at all, it reads better-auth's structured `[body.<field>]` prefix rather
 * than a French or English phrase, and the reason it is not a code is written
 * where it happens.
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
 * The sentence for "the call did not get through", for whichever action it was.
 *
 * Six screens each typed their own, swapping only the leading verb — and the verbs
 * are the part that drifts: the reset-password one already reordered its second
 * clause, with nothing recording why. One template now, so the wording of a
 * network blip is the same everywhere it is shown.
 */
export function authCallFailed(action: string): string {
  return `${action} impossible pour le moment. Vérifiez votre connexion, puis réessayez.`;
}

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

  // Field-level rejections, matched on the code. All three used to be matched on
  // a *sentence* — and on a French one, which the backend has never emitted: it
  // answers in English, and its own copy has been reworded since. Every one of
  // these branches was unreachable, so a name or password the server refused
  // fell through to "vérifiez votre connexion" below, which is a sentence about
  // the network for someone who mistyped their name.
  //
  // The password codes come from our own `before` hook (`PASSWORD_TOO_SHORT_OR_LONG`)
  // or from better-auth's own length check, depending on which got there first;
  // both are listed so the reader is told the same thing either way.
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

  // An invalid email is the one case with no code to match.
  //
  // Our hook validates the email's *bounds* only (trim, lowercase, length) and
  // leaves the shape to better-auth, so the rejection comes from its own zod
  // layer, which answers `VALIDATION_ERROR` for any field — too coarse to say
  // which. Its message is structured, though: `[body.<field>] <reason>`, and the
  // field is named. So the code plus that prefix is what identifies this, which
  // is still a string match, but on a format rather than on prose.
  //
  // What would remove the coupling: our hook rejecting a malformed email with its
  // own `INVALID_EMAIL`, the way it already rejects the name. That would be a
  // behaviour change on every path `emailSchema` guards — including sign-in
  // lookups against stored values — so it is a deliberate decision, not a
  // cleanup to slip in here.
  if (code === "VALIDATION_ERROR" && message.includes("[body.email]")) {
    return { existingAccount: false, message: EMAIL_ERROR_MESSAGE };
  }

  return {
    existingAccount: false,
    message: authCallFailed("Inscription"),
  };
}

/**
 * Whether this instance has password reset switched off.
 *
 * Lives here rather than in the container, because it is a reading of what
 * better-auth says — which is this module's whole subject — and the container was
 * the only one of five doing its own. A code added here from now on reaches this
 * screen too, instead of being handled on four and missed on the fifth.
 */
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
