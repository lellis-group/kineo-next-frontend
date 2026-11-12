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

export interface DeletionResult {
  status: DeletionOutcome;
  error?: string;
}

/** Drives the account-erasure confirmation: the job, the outcome, the sign-out and the retry. */
export function useDeletionConfirmation(token: string | null) {
  const [status, setStatus] = useState<DeletionOutcome>(
    token ? "deleting" : "invalid",
  );
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);

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
   * Replays the confirmation. Safe: a failed job is evicted from the cache, and
   * a refused confirmation does not consume the token.
   */
  const retry = useCallback(() => {
    if (!token) {
      return;
    }
    setStatus("deleting");
    setError("");
    requestDeletion(token).then(applyOutcome);
  }, [token, applyOutcome]);

  // The sessionless endpoint can't clear browser cookies, so sign out once it
  // succeeds. Only on success: on failure the account still works.
  useEffect(() => {
    if (status !== "success") {
      return;
    }

    let cancelled = false;

    signOut()
      .catch(() => {})
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
 * One in-flight job per token, shared across remounts (StrictMode): the token
 * is single-use, so the POST must be sent once. Failures are dropped so the
 * same link can be retried.
 */
const deletionJobs = new Map<string, Promise<DeletionResult>>();

function requestDeletion(token: string): Promise<DeletionResult> {
  const existing = deletionJobs.get(token);
  if (existing) {
    return existing;
  }

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

function toOutcome(failure: DeletionFailure): DeletionOutcome {
  switch (failure) {
    // Only from a backend one deploy behind.
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
