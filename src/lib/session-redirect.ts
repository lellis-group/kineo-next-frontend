import type { useRouter } from "next/navigation";
import { classifyError } from "./api-errors";

type Router = ReturnType<typeof useRouter>;

/**
 * The client-side twin of `lib/require-member.ts`: redirects to `/signin` on an
 * expired session and returns whether it did, so the caller can skip its own
 * error state.
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
