/**
 * The one place a failure becomes a French sentence.
 *
 * Classification reads the typed `status` / `code` / `fieldErrors` that
 * `apiFetch` already extracts, never the rendered string. Domain-specific
 * wording (a refused transition, a taken RPPS number) stays in the domain
 * service and layers on top via the `overrides` argument.
 */

import { ApiError } from "./api-client";

/** What a failure means to the reader, independent of the endpoint that failed. */
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
  /** A 5xx fault from a service that is otherwise up. Retrying may help. */
  | "unavailable"
  /**
   * The backend could not be reached (502/503/504, or a connection that never
   * completed). Kept apart from `unavailable`: the copy says the service is
   * down, not that a quick retry will help.
   */
  | "service-down"
  | "unknown";

const SESSION_STATUSES = new Set([401]);

/**
 * The request never got an answer from the backend. 502 is what our own proxy
 * (`lib/backend-proxy.ts`) returns when the hop fails. 500 is not here: the
 * service did answer.
 */
const SERVICE_DOWN_STATUSES = new Set([502, 503, 504]);

/** Duck-typed: the auth client returns error objects rather than `ApiError`. */
function statusOf(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;
  if (typeof error !== "object" || error === null) return undefined;
  const { status } = error as { status?: unknown };
  return typeof status === "number" ? status : undefined;
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

export function classifyError(error: unknown): ErrorKind {
  if (error instanceof ApiError && error.fieldErrors?.length) {
    return "validation";
  }

  const status = statusOf(error);

  if (status === undefined) {
    // A deadline or abort is not evidence that nothing is listening.
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return "unavailable";
    }
    // A `TypeError` from `fetch` means the request never landed.
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

/**
 * Whether no status was ever received. Needed beside `classifyError` for the
 * auth client, which resolves with a status-less object when the network drops.
 */
export function neverReached(error: unknown): boolean {
  return statusOf(error) === undefined;
}

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

/** The sentence to show for `error`; `overrides` wins for its kind. */
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
