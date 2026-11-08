/**
 * Received-application decision error mapping — French sentences for a refused
 * shortlist, accept, reject or « view ».
 *
 * Same extraction as `./listing-errors.ts` beside the listing writes: the
 * typed `ApiError` (status + code) is read here and turned into a sentence.
 */
import { ApiError } from "../api-client";
import { errorMessage } from "../api-errors";

/**
 * The codes the backend refuses a decision with, mirrored one for one from
 * `common/refusal.ts` over there — which is its source of truth. A bare 403
 * (someone else's listing) and a 404 (nothing there) answer as statuses only.
 */
export const APPLICATION_DECISION_CODES = {
  NOT_SHORTLISTABLE: "APPLICATION_NOT_SHORTLISTABLE",
  NOT_ACCEPTABLE: "APPLICATION_NOT_ACCEPTABLE",
  NOT_REJECTABLE: "APPLICATION_NOT_REJECTABLE",
  LISTING_NOT_ACCEPTING: "APPLICATION_LISTING_NOT_ACCEPTING",
} as const;

/**
 * What each refusal means, in the order the practice runs out of options.
 *
 * One sentence per code: a candidate another practice retained and one that
 * was refused in a state nobody can act on are different news for the same
 * table, and reading the same text twice would say the screen guessed.
 */
const DECISION_COPY: Record<
  (typeof APPLICATION_DECISION_CODES)[keyof typeof APPLICATION_DECISION_CODES],
  string
> = {
  [APPLICATION_DECISION_CODES.NOT_SHORTLISTABLE]:
    "Seule une candidature en attente peut être présélectionnée.",
  [APPLICATION_DECISION_CODES.NOT_ACCEPTABLE]:
    "Cette candidature ne peut plus être acceptée.",
  [APPLICATION_DECISION_CODES.NOT_REJECTABLE]:
    "Cette candidature ne peut plus être refusée.",
  [APPLICATION_DECISION_CODES.LISTING_NOT_ACCEPTING]:
    "Cette annonce n'est plus ouverte : elle ne peut plus être pourvue par une acceptation.",
};

/**
 * The sentence to show for a refused or failed decision.
 *
 * The card renders this beside its own row, so nothing here names the
 * application: the place where the sentence lands already says which one it
 * is about.
 */
export function applicationDecisionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      // The application is gone — withdrawn by the candidate between two
      // screens, or nobody federal to this listing: nothing to retry.
      return "Cette candidature n'existe plus.";
    }
    if (error.status === 403) {
      // No code on the bare exception, and no second meaning worth telling
      // apart here: this screen only ever renders the caller's own listings,
      // so a 403 is a listing that changed hands or a decision whose turn it
      // is no longer.
      return "Vous ne pouvez plus agir sur cette candidature.";
    }
    if (error.code && error.code in DECISION_COPY) {
      return DECISION_COPY[error.code as keyof typeof DECISION_COPY];
    }
  }
  return errorMessage(error);
}
