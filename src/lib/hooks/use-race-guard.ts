"use client";

import { useCallback, useRef } from "react";

/**
 * Guards a sequence of asynchronous requests so only the latest one may write.
 *
 * Both `usePaginatedResource` and `useExpandedCandidates` hand-rolled the same
 * pattern: a request id bumped per call, an `AbortController` whose signal is
 * forwarded to the fetch, and a `mine !== requestId.current` check before any
 * response is allowed to touch state. A late answer from a superseded request
 * is silently discarded, and the read it superseded is aborted rather than
 * left to race.
 *
 * Extracting it here means no call-site codes `requestId` + `AbortController`
 * by hand anymore — this is the single place that does.
 */
export function useRaceGuard() {
  /** Bumped per request; a response carrying a stale id is discarded. */
  const requestId = useRef(0);
  /** The read the last race started, cancelled by the next one. */
  const inFlight = useRef<AbortController | null>(null);

  /** Stops the read in progress, if any. */
  const cancel = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
  }, []);

  /**
   * Starts a new race: cancels any in-flight request, creates a fresh
   * `AbortController`, bumps the request id, and returns both. The caller
   * passes `controller.signal` to its fetch and checks `isStale(mine)` before
   * writing the answer.
   */
  const start = useCallback((): {
    controller: AbortController;
    mine: number;
  } => {
    cancel();
    const controller = new AbortController();
    inFlight.current = controller;
    requestId.current += 1;
    return { controller, mine: requestId.current };
  }, [cancel]);

  /** True when this response belongs to a request that has been superseded. */
  const isStale = useCallback((mine: number): boolean => {
    return mine !== requestId.current;
  }, []);

  /** Marks the in-flight request as settled (success or failure). */
  const settled = useCallback(() => {
    inFlight.current = null;
  }, []);

  /**
   * Invalidates any in-flight request without starting a new one: aborts it
   * and bumps the request id so a late answer is discarded.
   */
  const revoke = useCallback(() => {
    cancel();
    requestId.current += 1;
  }, [cancel]);

  return { cancel, start, isStale, settled, revoke };
}
