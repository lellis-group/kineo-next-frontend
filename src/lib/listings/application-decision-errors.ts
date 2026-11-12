/** French sentences for a refused shortlist, accept, reject or « view ». */
import { ApiError } from "../api-client";
import { errorMessage } from "../api-errors";

/**
 * The codes a decision is refused with (`common/refusal.ts`). A bare 403 or
 * 404 is answered by status.
 */
export const APPLICATION_DECISION_CODES = {
  NOT_SHORTLISTABLE: "APPLICATION_NOT_SHORTLISTABLE",
  NOT_ACCEPTABLE: "APPLICATION_NOT_ACCEPTABLE",
  NOT_REJECTABLE: "APPLICATION_NOT_REJECTABLE",
  LISTING_NOT_ACCEPTING: "APPLICATION_LISTING_NOT_ACCEPTING",
} as const;

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

/** The sentence for a refused or failed decision, shown beside its own row. */
export function applicationDecisionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      // Withdrawn between two screens: nothing to retry.
      return "Cette candidature n'existe plus.";
    }
    if (error.status === 403) {
      return "Vous ne pouvez plus agir sur cette candidature.";
    }
    if (error.code && error.code in DECISION_COPY) {
      return DECISION_COPY[error.code as keyof typeof DECISION_COPY];
    }
  }
  return errorMessage(error);
}
