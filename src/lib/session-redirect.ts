import type { useRouter } from "next/navigation";
import { classifyError } from "./api-errors";

/**
 * Derived from the hook rather than imported as a named type: this module only
 * needs "something with a `replace`", and `ReturnType` keeps that true whatever
 * the hook's return type is spelled.
 */
type Router = ReturnType<typeof useRouter>;

/**
 * The client-side twin of `lib/require-member.ts`.
 *
 * Returns whether it handled the error, so the caller can tell "redirected" from
 * "a real failure worth showing":
 *
 * ```ts
 * .catch((err) => {
 *   if (signInOnExpiredSession(err, router)) return;
 *   setError(err);
 * })
 * ```
 *
 * Classification goes through `classifyError` rather than reading `status === 401`
 * directly, so a screen does not hardcode the one status that means "sign in
 * again" — the same single answer `ErrorState` would give for the same failure.
 */
export function signInOnExpiredSession(
  error: unknown,
  router: Router,
): boolean {
  if (classifyError(error) !== "session") {
    return false;
  }
  router.replace("/signin");
  return true;
}
