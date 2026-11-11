"use client";

import { useState } from "react";

/**
 * The pending flag and the error sentence of one asynchronous submit.
 *
 * Every form that writes runs the same sequence: clear the previous error, mark
 * the request in flight, await it, turn a failure into a French sentence, and
 * release the flag whatever happened. Written once so no copy forgets the
 * `finally` and leaves a button spinning forever.
 *
 * `toMessage` returns `null` when the failure was already handled elsewhere —
 * an expired session redirected to the sign-in page — and nothing should be
 * printed under the form.
 *
 * `run` resolves to whether the work succeeded, so the caller can move its own
 * state machine on (close the form, show the confirmation) without catching.
 */
export function useAsyncSubmit(toMessage: (err: unknown) => string | null) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run(work: () => Promise<unknown>): Promise<boolean> {
    setError("");
    setPending(true);
    try {
      await work();
      return true;
    } catch (err) {
      const message = toMessage(err);
      if (message) setError(message);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { pending, error, run, clearError: () => setError("") };
}
