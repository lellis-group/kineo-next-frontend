"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AccountDeletionError,
  confirmAccountDeletion,
  type DeletionFailure,
  type DeletionOutcome,
} from "@/lib/account-deletion-service";
import { signOut } from "@/lib/auth-client";
import { authCallFailed } from "@/lib/auth-errors";

/** What a confirmation attempt settled on, with the wording to show. */
export interface DeletionResult {
  status: DeletionOutcome;
  error?: string;
}

/**
 * Drives the account-erasure confirmation.
 *
 * The whole flow lives here rather than in the route: one in-flight job per
 * token, the outcome mapping, the sign-out and the retry. `app/goodbye/page.tsx`
 * is left holding the token from the URL and a focus ref, which are the only two
 * things that genuinely belong to the screen.
 */
export function useDeletionConfirmation(token: string | null) {
  const [status, setStatus] = useState<DeletionOutcome>(
    token ? "deleting" : "invalid",
  );
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

  /** Empty deps: the two setters are stable, so this never needs to be rebuilt. */
  const applyOutcome = useCallback((result: DeletionResult) => {
    setStatus(result.status);
    setError(result.error ?? "");
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    requestDeletion(token).then((result) => {
      if (!cancelled) applyOutcome(result);
    });

    return () => {
      cancelled = true;
    };
  }, [token, applyOutcome]);

  /**
   * Replays the confirmation, from the retry button on the transient failures.
   *
   * Safe to call repeatedly: a failed job was evicted from the cache, and a
   * refused confirmation rolls back without consuming the token, so the
   * single-use credential is still there.
   */
  const retry = useCallback(() => {
    if (!token) {
      return;
    }
    setStatus("deleting");
    setError("");
    requestDeletion(token).then(applyOutcome);
  }, [token, applyOutcome]);

  // The sessionless confirm-deletion endpoint wipes sessions server-side but
  // cannot clear browser cookies (no Set-Cookie on its response). Signing out
  // drops the ghost cookie and the cookie-cache JWT; it clears cookies even when
  // the session row is already gone. Never blocks the screen: a failure just
  // leaves the button to /signup, which is public anyway.
  //
  // Only on success — every failure rolls the transaction back and leaves the
  // account intact, so signing out early would lock someone out of an account
  // that still works.
  useEffect(() => {
    if (status !== "success") {
      return;
    }

    let cancelled = false;

    signOut()
      .catch(() => {
        // Cookie cleanup is best-effort — the account is already anonymized.
      })
      .finally(() => {
        if (!cancelled) {
          setSignedOut(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  return { status, error, signedOut, retry };
}

/**
 * One in-flight deletion job per token, shared across component remounts (React
 * StrictMode double-mounts effects in dev). The confirmation POST consumes a
 * single-use server-side token, so it must be sent exactly once: a double request
 * would anonymize the account on the first call and fail with an invalid-token
 * error on the second.
 *
 * Only successful and in-flight jobs are kept. A failure is dropped on purpose:
 * nothing was consumed server-side, so re-confirming the same link has to be able
 * to succeed on a second attempt.
 */
const deletionJobs = new Map<string, Promise<DeletionResult>>();

function requestDeletion(token: string): Promise<DeletionResult> {
  const existing = deletionJobs.get(token);
  if (existing) {
    return existing;
  }

  // Sessionless confirmation: the email link alone is enough, no session cookie
  // needed (see @/lib/account-deletion-service).
  const job = confirmAccountDeletion(token).then(
    (): DeletionResult => ({ status: "success" }),
    (error: unknown): DeletionResult => {
      deletionJobs.delete(token);
      return {
        status:
          error instanceof AccountDeletionError
            ? toOutcome(error.failure)
            : "error",
        error:
          error instanceof Error
            ? error.message
            : authCallFailed("Suppression"),
      };
    },
  );

  deletionJobs.set(token, job);
  return job;
}

/** Exhaustively maps a failure onto an outcome; no silent fallthrough. */
function toOutcome(failure: DeletionFailure): DeletionOutcome {
  switch (failure) {
    // The backend no longer refuses an erasure over third-party applications: it
    // detaches them onto ghost listings first, so the request always goes through.
    // This case only survives for a backend one deploy behind, and deliberately
    // lands on the generic error rather than on a screen telling the user to close
    // their listings — advice that would not help.
    case "blocked":
    case "no-pending-request":
      return "no-pending-request";
    case "already-erased":
      return "already-erased";
    case "invalid":
      return "invalid";
    case "rate-limited":
      return "rate-limited";
    case "unavailable":
      return "error";
  }
}
