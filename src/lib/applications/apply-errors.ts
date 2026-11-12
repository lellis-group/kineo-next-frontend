/** French sentences for a refused apply. */
import { ApiError } from "../api-client";
import { errorMessage } from "../api-errors";

/**
 * The refusal codes `POST /applications` sends (`common/refusal.ts`). Its other
 * refusals — a bare 403 or 404 — are answered by status below.
 */
export const APPLICATION_CREATE_CODES = {
  LISTING_NOT_ACCEPTING: "APPLICATION_LISTING_NOT_ACCEPTING",
  LISTING_LIMIT_REACHED: "APPLICATION_LISTING_LIMIT_REACHED",
  QUOTA_REACHED: "APPLICATION_QUOTA_REACHED",
} as const;

export const APPLY_SUCCESS = "Votre candidature a été envoyée.";

const REFUSAL_COPY: Record<
  (typeof APPLICATION_CREATE_CODES)[keyof typeof APPLICATION_CREATE_CODES],
  string
> = {
  [APPLICATION_CREATE_CODES.LISTING_NOT_ACCEPTING]:
    "Cette annonce n'accepte plus de candidature.",
  [APPLICATION_CREATE_CODES.LISTING_LIMIT_REACHED]:
    "Le nombre maximum de candidatures pour cette annonce est atteint.",
  [APPLICATION_CREATE_CODES.QUOTA_REACHED]:
    "Vous avez atteint le nombre maximum de candidatures actives.",
};

/**
 * The sentence for a refused or failed apply. Session expiry is handled at the
 * call site by `signInOnExpiredSession`.
 */
export function applyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Vous avez déjà postulé à cette annonce.";
    }
    if (error.status === 404) {
      return "Cette annonce n'existe plus ou n'est plus accessible.";
    }
    if (error.status === 403) {
      // Three possible reasons and no code: state the outcome, not a guess.
      return "Vous ne pouvez pas postuler à cette annonce.";
    }
    if (error.code && error.code in REFUSAL_COPY) {
      return REFUSAL_COPY[error.code as keyof typeof REFUSAL_COPY];
    }
  }
  return errorMessage(error);
}
