import { Button } from "@/components/atoms/button";
import { ApiError } from "@/lib/api-client";
import { STRIP_CONTAINER } from "@/lib/layout";

/**
 * A refresh that failed, over content that is still on screen.
 *
 * The one error state a list screen has that `ErrorState` cannot express: the
 * server already delivered a usable view, so a later read going wrong must not
 * throw that view away. Replacing a working list with an error card would also
 * hide the chips that would let the reader navigate out of the broken state.
 *
 * Two screens had this written out identically down to the className, with one
 * word of the sentence differing — which is the failure mode: the next person to
 * need one copies the copy too, and now two screens disagree about what a
 * failed refresh says about the data underneath it.
 *
 * `message` is the noun-specific half; the surrounding sentence is not, so it
 * lives here.
 *
 * ## Why a 429 is told apart
 *
 * Paging through a list fast enough earns a 429 from the backend's rate limit,
 * and it is the one failure here where « the service had a problem » is the
 * wrong thing to say: the service is fine, the reader simply outpaced it. The
 * generic copy would have them retry immediately into the same wall. A 429
 * instead says to wait a moment — the one piece of advice that actually clears
 * it. `error` is read for its status only; anything else keeps the generic copy.
 */
export function InlineRetryBanner({
  noun,
  onRetry,
  error,
}: {
  /** What the stale content is — « les candidatures », « les annonces ». */
  noun: string;
  onRetry: () => void;
  /**
   * The failure behind the banner, when the caller has it. Read only to tell a
   * 429 apart; optional so a caller with nothing more than « it failed » keeps
   * the generic copy unchanged.
   */
  error?: unknown;
}) {
  const rateLimited = error instanceof ApiError && error.status === 429;

  return (
    <div role="alert" className={STRIP_CONTAINER}>
      <p className="text-sm text-danger">
        {rateLimited
          ? "Trop de requêtes envoyées trop vite. Patientez un instant avant de réessayer."
          : `Actualisation impossible. ${noun} affichées peuvent être obsolètes.`}
      </p>
      <Button variant="secondary" className="shrink-0" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
