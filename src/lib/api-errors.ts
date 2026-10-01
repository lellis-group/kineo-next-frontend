/**
 * The one place a failure becomes a French sentence.
 *
 * Every screen used to carry its own `mapXError`, all of them re-deciding what a
 * 401 or a 409 means and re-typing the same session-expired sentence. That made
 * the copy drift apart per screen, and it made `ErrorState` classify failures by
 * running a regex over the *message* of an `ApiError` — which quietly stopped
 * matching the moment the message template changed.
 *
 * Classification reads the typed `status` / `code` / `fieldErrors` that
 * `apiFetch` already extracts, never the rendered string. Domain-specific
 * wording (a refused transition, a taken RPPS number) stays in the domain
 * service and layers on top via the `overrides` argument.
 */

import { ApiError } from "./api-client";

/**
 * What a failure means to the reader, independent of the endpoint that failed.
 *
 * The screens branch on this rather than on HTTP status, so a backend that
 * starts answering 403 where it used to answer 404 changes the copy in one
 * place instead of on every call site.
 */
export type ErrorKind =
  /** The session is gone or was refused — sign-in is the only way forward. */
  | "session"
  /** The resource is not there, or is not visible to this reader. */
  | "not-found"
  /** Signed in, but not allowed to do this. */
  | "forbidden"
  /** The request is well-formed but the current state refuses it. */
  | "conflict"
  /** Field-level validation issues. */
  | "validation"
  /**
   * The backend answered with a fault of its own — a 5xx other than the
   * service-down trio.
   *
   * The request reached the service and it failed. Retrying may help.
   */
  | "unavailable"
  /**
   * The backend could not be reached at all, or answered "not serving right
   * now" (502/503/504, or a connection that never completed).
   *
   * Kept apart from `unavailable` because the two call for different advice: a
   * 500 means something went wrong inside a service that is otherwise up,
   * while a 502 means the request never got there — a deploy, a dropped
   * connection, a backend that is not booting. Telling someone to "réessayer"
   * about a 502 implies a second attempt two seconds later is worth making, and
   * against a crash loop it is not. The message says the service is down rather
   * than degraded, so the reader knows the problem is not on their side and that
   * nothing they did was lost.
   */
  | "service-down"
  /** Anything the classifier could not place. */
  | "unknown";

/** The status codes every endpoint in this API answers with. */
const SESSION_STATUSES = new Set([401]);

/**
 * Statuses meaning the request never got an answer from the backend.
 *
 * 502 is what this app's own proxy returns when the hop to the backend fails —
 * see `lib/backend-proxy.ts`, which is where a 502 actually comes from in this
 * deployment. 503 and 504 are its siblings: "not serving right now" and
 * "timed out waiting for it".
 *
 * 500 is deliberately NOT here: it means the request did arrive and the service
 * answered with a fault of its own, which is a different situation and keeps the
 * `unavailable` copy.
 */
const SERVICE_DOWN_STATUSES = new Set([502, 503, 504]);

/**
 * Reads the status off whatever was thrown.
 *
 * The auth client (`authClient.*`) does not raise `ApiError` — it returns an
 * error object carrying its own `status` — so the shape is duck-typed here
 * rather than by `instanceof`.
 */
function statusOf(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;
  if (typeof error !== "object" || error === null) return undefined;
  const { status } = error as { status?: unknown };
  return typeof status === "number" ? status : undefined;
}

/** Narrows to `Error`, which is all the console needs for a dev overlay. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * Which kind of failure this is. Network failures — a rejected `fetch`, a
 * TypeError from a cut connection — carry no status and land in `unavailable`
 * rather than `unknown`, because retrying is the one thing that can help.
 */
export function classifyError(error: unknown): ErrorKind {
  if (error instanceof ApiError && error.fieldErrors?.length) {
    return "validation";
  }

  const status = statusOf(error);

  if (status === undefined) {
    // A thrown `TypeError` from `fetch` means the request never landed, which is
    // the same situation as a 502 by another route: nothing is on the other end.
    return error instanceof TypeError ? "service-down" : "unknown";
  }
  if (SESSION_STATUSES.has(status)) return "session";
  if (SERVICE_DOWN_STATUSES.has(status)) return "service-down";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 400 || status === 409 || status === 422) return "conflict";
  if (status === 429) return "unavailable";
  return status >= 500 ? "unavailable" : "unknown";
}

/** The default French sentence for a kind of failure. */
const DEFAULT_COPY: Record<ErrorKind, string> = {
  session: "Votre session a expiré. Veuillez vous reconnecter.",
  "not-found": "Cette information n'est pas disponible. Veuillez réessayer.",
  forbidden:
    "Action non autorisée. Vérifiez que votre adresse e-mail est validée.",
  conflict: "L'opération n'est pas possible dans l'état actuel des données.",
  validation: "Certains champs sont invalides. Vérifiez le formulaire.",
  unavailable:
    "Le service a rencontré un problème. Veuillez réessayer dans un instant.",
  "service-down":
    "Le service est momentanément hors service. Vos données sont intactes, mais rien ne peut être enregistré pour le moment : réessayez dans quelques minutes.",
  unknown: "Une erreur inattendue est survenue. Veuillez réessayer.",
};

/** Extra copy for a specific `ErrorKind`, from a domain that knows more. */
export type ErrorOverrides = Partial<Record<ErrorKind, string>>;

/**
 * The sentence to show for `error`.
 *
 * `overrides` wins over the default for that kind, which is how a domain keeps
 * its own wording ("cette candidature ne peut plus être modifiée") without
 * re-implementing the parts it has nothing to add to.
 */
export function errorMessage(
  error: unknown,
  overrides: ErrorOverrides = {},
): string {
  const kind = classifyError(error);
  return overrides[kind] ?? DEFAULT_COPY[kind];
}

/** The raw text, for `[dev]` overlays. Never shown in production. */
export function rawErrorText(error: unknown): string {
  return describe(error);
}
