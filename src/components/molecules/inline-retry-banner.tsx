import { Button } from "@/components/atoms/button";
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
 */
export function InlineRetryBanner({
  noun,
  onRetry,
}: {
  /** What the stale content is — « les candidatures », « les annonces ». */
  noun: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className={STRIP_CONTAINER}>
      <p className="text-sm text-danger">
        Actualisation impossible. {noun} affichées peuvent être obsolètes.
      </p>
      <Button variant="secondary" className="shrink-0" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
