/**
 * Listing error mapping — French sentences for refused or failed listing reads
 * and writes.
 *
 * Extracted from `./service` so the service module keeps only transport and
 * data fetching. The typed `ApiError` (status + code) is read here and turned
 * into a sentence; the service lets it through untouched.
 */
import { ApiError } from "../api-client";
import { errorMessage } from "../api-errors";
import type { ListingActionKind } from "./service";

/** The owner actions on a listing this module performs. */
export type { ListingActionKind };

/**
 * The refusal codes the backend sends on a listing write, mirrored one for one.
 *
 * `common/refusal.ts` on the other side is the source; these are the listing
 * codes of its `REFUSAL_CODES` — the application and profile ones belong to
 * screens this module does not serve. The names follow the backend's *semantics*
 * rather than its internal keys, so a rename there reads here as a rename.
 */
export const LISTING_TRANSITION_CODES = {
  NOT_DRAFT: "LISTING_NOT_DRAFT",
  NOT_MODIFIABLE: "LISTING_NOT_MODIFIABLE",
  INVALID_DATES: "LISTING_INVALID_DATES",
  NOT_CLOSEABLE: "LISTING_NOT_CLOSEABLE",
  ALREADY_CLOSED: "LISTING_ALREADY_CLOSED",
  FILLED_CANNOT_BE_DELETED: "LISTING_FILLED_CANNOT_BE_DELETED",
  QUOTA_REACHED: "LISTING_QUOTA_REACHED",
} as const;

/**
 * The French for each action: the infinitive the refusal sentences interpolate
 * (« clôturer », « annuler »), and the past participle the outage sentence needs
 * (« l'annonce n'a pas été clôturée »).
 */
const ACTION_COPY: Record<ListingActionKind, { verb: string; done: string }> = {
  close: { verb: "clôturer", done: "clôturée" },
  cancel: { verb: "annuler", done: "annulée" },
};

/** The confirmation sentence each owner action reports on success. */
export const ACTION_SUCCESS: Record<ListingActionKind, string> = {
  close: "Annonce clôturée. Les candidatures en cours ont été terminées.",
  cancel: "Annonce annulée. Les candidatures en cours ont été terminées.",
};

/**
 * What each refusal code means, in French.
 *
 * A function rather than a string only where the sentence names the action: the
 * backend sends the same `LISTING_NOT_CLOSEABLE` whether the practice asked to
 * close or to cancel, and « Impossible de clôturer » on a cancel button is a
 * sentence about the wrong thing.
 */
const LISTING_REFUSAL_MESSAGES: Record<
  (typeof LISTING_TRANSITION_CODES)[keyof typeof LISTING_TRANSITION_CODES],
  string | ((action: ListingActionKind) => string)
> = {
  [LISTING_TRANSITION_CODES.NOT_DRAFT]:
    "Seule une annonce en brouillon peut être publiée.",
  [LISTING_TRANSITION_CODES.NOT_MODIFIABLE]:
    "Cette annonce n'est plus modifiable : elle a quitté la diffusion.",
  [LISTING_TRANSITION_CODES.INVALID_DATES]:
    "La date de début doit précéder la date de fin.",
  [LISTING_TRANSITION_CODES.NOT_CLOSEABLE]: (action) =>
    `Impossible de ${ACTION_COPY[action].verb} l'annonce : elle n'est plus en diffusion.`,
  [LISTING_TRANSITION_CODES.ALREADY_CLOSED]: (action) =>
    `Impossible de ${ACTION_COPY[action].verb} l'annonce : elle a quitté la diffusion (clôturée, annulée ou pourvue).`,
  [LISTING_TRANSITION_CODES.FILLED_CANNOT_BE_DELETED]:
    "Impossible de supprimer l'annonce : elle est pourvue. Clôturez-la à la place.",
  [LISTING_TRANSITION_CODES.QUOTA_REACHED]:
    "Vous avez atteint le nombre maximal d'annonces. Libérez-en une ou contactez-nous.",
};

/**
 * A refused or failed owner action, in French.
 */
export function listingActionErrorMessage(
  error: unknown,
  action: ListingActionKind,
): string {
  const { verb, done } = ACTION_COPY[action];

  if (error instanceof ApiError) {
    const byCode =
      error.code === undefined
        ? undefined
        : LISTING_REFUSAL_MESSAGES[
            error.code as keyof typeof LISTING_REFUSAL_MESSAGES
          ];
    if (byCode !== undefined) {
      return typeof byCode === "function" ? byCode(action) : byCode;
    }

    if (error.status === 404) {
      return "Cette annonce n'existe plus.";
    }
    if (error.status === 403) {
      return errorMessage(error, {
        forbidden:
          "Vous n'êtes pas le propriétaire de cette annonce, ou votre adresse e-mail n'est pas validée.",
      });
    }
    if (error.status === 409) {
      return `Impossible de ${verb} l'annonce : des candidatures d'autres candidats lui sont encore actives.`;
    }
    if (error.status === 400 || error.status === 409 || error.status === 422) {
      return `Impossible de ${verb} l'annonce dans son état actuel.`;
    }
  }

  return errorMessage(error, {
    unavailable: `Impossible de ${verb} l'annonce pour le moment. Veuillez réessayer.`,
    "service-down": `Le service est hors service : l'annonce n'a pas été ${done}. Réessayez dans quelques minutes.`,
  });
}

/**
 * A failed *read* on a listing, in French, with the 403 case spelled out.
 */
export function listingReadErrorMessage(error: unknown): string {
  return errorMessage(error, {
    forbidden:
      "Cette annonce ne vous appartient pas, ou elle n'existe plus. Retournez à vos annonces.",
  });
}
