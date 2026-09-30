"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  DeletionScreen,
  type DeletionScreenStatus,
} from "@/components/molecules/deletion-screen";
import { LoadingState } from "@/components/molecules/loading-state";
import {
  AccountDeletionError,
  confirmAccountDeletion,
  type DeletionFailure,
} from "@/lib/account-deletion-service";
import { signOut, useSession } from "@/lib/auth-client";

type DeletionOutcome = {
  status: DeletionScreenStatus;
  error?: string;
};

/**
 * One in-flight deletion job per token, shared across component remounts
 * (React StrictMode double-mounts effects in dev). The confirmation POST
 * consumes a single-use server-side token, so it must be sent exactly once: a
 * double request would anonymize the account on the first call and fail with an
 * invalid-token error on the second.
 *
 * Only successful and in-flight jobs are kept. A failure is dropped from the
 * map on purpose: nothing was consumed server-side, so re-confirming the same
 * link has to be able to succeed on a second attempt. That also means the map
 * only ever holds entries for tokens currently on screen, and is reset when the
 * module is.
 */
const deletionJobs = new Map<string, Promise<DeletionOutcome>>();

function requestDeletion(token: string): Promise<DeletionOutcome> {
  const existing = deletionJobs.get(token);
  if (existing) {
    return existing;
  }

  // Sessionless confirmation: the email link alone is enough, no session
  // cookie is needed (see @/lib/account-deletion-service).
  const job = confirmAccountDeletion(token).then(
    (): DeletionOutcome => ({ status: "success" }),
    (error: unknown): DeletionOutcome => {
      deletionJobs.delete(token);
      return {
        status:
          error instanceof AccountDeletionError
            ? toStatus(error.failure)
            : "error",
        error:
          error instanceof Error
            ? error.message
            : "Suppression impossible pour le moment. Vérifiez votre connexion, puis réessayez.",
      };
    },
  );

  deletionJobs.set(token, job);
  return job;
}

/** Exhaustively maps a failure onto a screen; no silent fallthrough. */
function toStatus(failure: DeletionFailure): DeletionScreenStatus {
  switch (failure) {
    // The backend no longer refuses an erasure over third-party applications:
    // it detaches them onto ghost listings first, so the request always goes
    // through. This case only survives for a backend one deploy behind, and
    // deliberately lands on the generic error rather than on a screen telling
    // the user to close their listings — advice that would not help.
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

function GoodbyeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session } = useSession();
  const user = session?.user;
  const [status, setStatus] = useState<DeletionScreenStatus>(
    token ? "deleting" : "invalid",
  );
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  /**
   * Focus target: the card's heading. The whole card is replaced as the flow
   * settles, so without this a keyboard user is left tabbing back through
   * whatever was on the page before.
   */
  const headingRef = useRef<HTMLHeadingElement>(null);

  const applyOutcome = useCallback((outcome: DeletionOutcome) => {
    setStatus(outcome.status);
    setError(outcome.error ?? "");
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    requestDeletion(token).then((outcome) => {
      if (cancelled) {
        return;
      }
      applyOutcome(outcome);
    });

    return () => {
      cancelled = true;
    };
  }, [token, applyOutcome]);

  /**
   * Replays the confirmation. Used from the retry button on the transient
   * failures.
   *
   * Safe to call repeatedly: the failed job was evicted from `deletionJobs`, and
   * a refused confirmation rolls back without consuming the token, so the
   * single-use credential is still there.
   */
  const retryConfirmation = useCallback(() => {
    if (!token) {
      return;
    }

    setStatus("deleting");
    setError("");

    requestDeletion(token).then(applyOutcome);
  }, [token, applyOutcome]);

  // The sessionless confirm-deletion endpoint wipes sessions server-side but
  // can't clear browser cookies (no Set-Cookie on its response). Sign out to
  // drop the ghost cookie + the cookie-cache JWT; it always clears cookies
  // even when the session row is already gone. Never blocks the screen:
  // failure just leaves the button to /signup, which is public anyway.
  //
  // Only on success: every failure rolls the transaction back and leaves the
  // account fully intact, so signing the user out early would lock them out of
  // a working account.
  useEffect(() => {
    if (status !== "success") {
      return;
    }

    let cancelled = false;

    signOut()
      .catch(() => {
        // Cookie cleanup best-effort — the account is already anonymized.
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

  // Move focus onto the new heading once a screen has settled. Skipped while
  // the request is in flight and on the way to success: both keep the same
  // heading on screen, and moving focus mid-flight would interrupt whatever the
  // reader was doing.
  useEffect(() => {
    if (status === "deleting" || status === "success") {
      return;
    }
    headingRef.current?.focus();
  }, [status]);

  return (
    <DeletionScreen
      status={status}
      error={error}
      signedOut={signedOut}
      hasSession={Boolean(user)}
      onRetry={retryConfirmation}
      headingRef={headingRef}
    />
  );
}

export default function GoodbyePage() {
  return (
    <Suspense fallback={<LoadingState className="min-h-dvh bg-background" />}>
      <GoodbyeContent />
    </Suspense>
  );
}
