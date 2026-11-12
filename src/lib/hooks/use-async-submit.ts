"use client";

import { useState } from "react";

/**
 * The pending flag and error sentence of one async submit. `toMessage` returns
 * `null` when the failure was handled elsewhere (an expired session). `run`
 * resolves to whether the work succeeded.
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
