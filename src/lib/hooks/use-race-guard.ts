"use client";

import { useCallback, useRef } from "react";

/**
 * Guards a sequence of async requests so only the latest may write: a request
 * id checked before writing, and an `AbortController` cancelling the
 * superseded read.
 */
export function useRaceGuard() {
  const requestId = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
  }, []);

  /** Cancels any in-flight request and returns a fresh controller and id. */
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

  const isStale = useCallback((mine: number): boolean => {
    return mine !== requestId.current;
  }, []);

  const settled = useCallback(() => {
    inFlight.current = null;
  }, []);

  /** Invalidates any in-flight request without starting a new one. */
  const revoke = useCallback(() => {
    cancel();
    requestId.current += 1;
  }, [cancel]);

  return { cancel, start, isStale, settled, revoke };
}
