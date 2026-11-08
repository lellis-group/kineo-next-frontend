/**
 * Application-create error mapping — French sentences for a refused apply.
 *
 * Same extraction as `../listings/listing-errors.ts`: the typed `ApiError`
 * (status + code) is read here and turned into a sentence, and the service
 * module keeps only transport and data fetching.
 */
import { ApiError } from "../api-client";
import { errorMessage } from "../api-errors";

/**
 * The refusal codes the backend sends on `POST /applications`, mirrored one for
 * one from `common/refusal.ts` on the other side — semantics-first names, like
 * `LISTING_TRANSITION_CODES` beside the listing writes.
 *
 * The other two refusals the endpoint can answer are not codes: a bare 403
 * « Only replacement profiles can apply » (or « You cannot apply to your own
 * listing », or an unverified email from the guard) and a plain 404 for a
 * listing that is gone or not readable. Both are answered by status, below.
 */
export const APPLICATION_CREATE_CODES = {
  LISTING_NOT_ACCEPTING: "APPLICATION_LISTING_NOT_ACCEPTING",
  LISTING_LIMIT_REACHED: "APPLICATION_LISTING_LIMIT_REACHED",
  QUOTA_REACHED: "APPLICATION_QUOTA_REACHED",
} as const;

/** The confirmation each successful apply reports. */
export const APPLY_SUCCESS = "Votre candidature a été envoyée.";

/**
 * The sentences for the three coded refusals, distinct on purpose: the reader
 * can act on each one differently (retry later, give up on this listing, free a
 * slot by withdrawing somewhere else), and one sentence for three situations
 * would be advice that is wrong twice out of three.
 */
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
 * The sentence to show for a refused or failed apply.
 *
 * Session expiry is deliberately *not* in the table: `signInOnExpiredSession`
 * at the call site routes a session that ended mid-submit to the sign-in page,
 * which is the answer a reader can act on — reporting « Veuillez réessayer »
 * over a page that was about to reload into a form they must refill would read
 * as the app having lost their five-line introduction.
 */
export function applyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      // The unique constraint is the whole meaning of a duplicate apply, and the
      // reader cannot fix it: they applied already, it stays applied.
      return "Vous avez déjà postulé à cette annonce.";
    }
    if (error.status === 404) {
      // The listing is gone or was never readable to this account — not a
      // transient state to retry.
      return "Cette annonce n'existe plus ou n'est plus accessible.";
    }
    if (error.status === 403) {
      // One status, three meanings on the backend (not a replacement profile,
      // own listing, unverified e-mail) and no code to tell them apart. The
      // sentence says what the button can no longer do, none of the reasons,
      // because a guess published as a fact reads as worse than a gap.
      return "Vous ne pouvez pas postuler à cette annonce.";
    }
    if (error.code && error.code in REFUSAL_COPY) {
      return REFUSAL_COPY[error.code as keyof typeof REFUSAL_COPY];
    }
  }
  return errorMessage(error);
}
