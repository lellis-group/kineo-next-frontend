"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/**
 * One resource, paged and filtered, seeded from the server payload.
 *
 * All three console screens are the same screen: a server page delivers the
 * default view so the route is readable on arrival, and every other combination
 * of filter and page is client state that fetches. That pairing was written out
 * three times, and the copies had drifted in a way that mattered.
 *
 * ## Why the default view is *restored*, not skipped
 *
 * The obvious implementation — "if this is the default view, don't fetch" — is
 * wrong, and was the bug in two of the three copies. Returning to « Toutes »
 * from another bucket makes the condition true again, so nothing was fetched
 * *and nothing was reset*: the previous bucket's rows stayed on screen under a
 * chip row that had already switched. Going back to the default view is a
 * request like any other, and `initialData` is its answer.
 *
 * ## The cancellation guard is not optional
 *
 * Only the detail screen had one. Without it, switching chips faster than the
 * network answers lets responses land out of order, and a slow request for the
 * bucket you just left overwrites the rows for the bucket you are now looking at
 * — no error, and nothing for the reader to tell it apart. Every response is
 * therefore checked against a request id before it is allowed to write.
 *
 * ## What the request id does not do
 *
 * It discards the answer, and leaves the request running. Every discarded read
 * still went to the backend, was answered, and was paid for by a reader who is
 * no longer looking at it — which matters most where the read is most expensive
 * (the listings map). `load` is handed a `RequestInit` carrying a signal, so a
 * view change cancels the read it supersedes rather than ignoring its answer.
 */
export function usePaginatedResource<T, V>({
  initialData,
  view,
  isDefaultView,
  load,
  onLoaded,
  onRestored,
}: {
  /** The server's answer for the default view. */
  initialData: T;
  /** Current filter/page combination. */
  view: V;
  isDefaultView: (view: V) => boolean;
  /** Fetches one view. Rejections surface as `error`, never as a throw. */
  load: (view: V, init?: RequestInit) => Promise<T>;
  /** After a successful fetch — drop caches that described the previous rows. */
  onLoaded?: () => void;
  /** After restoring `initialData`, which is also a view change. */
  onRestored?: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  /**
   * The optional callbacks are read through refs so that an inline arrow at the
   * call site does not have to be memoised by every caller to keep this hook's
   * effect from re-running on every render. The ref is written during render and
   * read at effect time, so the callback is always the latest one.
   */
  const afterLoad = useRef(onLoaded);
  const afterRestore = useRef(onRestored);
  afterLoad.current = onLoaded;
  afterRestore.current = onRestored;

  /** Bumped per request; a response with a stale id is discarded. */
  const requestId = useRef(0);
  /** The read the last view change started, cancelled by the next one. */
  const inFlight = useRef<AbortController | null>(null);

  /**
   * Stops the read in progress, if any.
   *
   * An aborted fetch rejects with an `AbortError`, which the caller's `load` has
   * to survive: the abort is this hook's decision, not a failure of the
   * endpoint, and reading it as one would put « could not read » on a screen
   * whose request the reader themselves superseded.
   */
  const cancel = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
  }, []);

  const fetchView = useCallback(
    (target: V) => {
      cancel();
      inFlight.current = new AbortController();

      const controller = inFlight.current;
      requestId.current += 1;
      const mine = requestId.current;

      setError(null);
      setLoading(true);

      load(target, { signal: controller.signal })
        .then((loaded) => {
          if (mine !== requestId.current) return;
          inFlight.current = null;
          setData(loaded);
          setLoading(false);
          afterLoad.current?.();
        })
        .catch((err) => {
          if (mine !== requestId.current) return;
          inFlight.current = null;
          setLoading(false);
          // The abort above, not a broken endpoint: nothing to show and nothing
          // to say, because the reader is already looking at the next view's rows.
          if (controller.signal.aborted) return;
          if (signInOnExpiredSession(err, router)) return;
          setError(err);
        });
    },
    [cancel, load, router],
  );

  const restore = useCallback(() => {
    // Invalidate any request still in flight: its answer describes a view the
    // reader has already left.
    cancel();
    requestId.current += 1;
    setData(initialData);
    setError(null);
    setLoading(false);
    afterRestore.current?.();
  }, [cancel, initialData]);

  useEffect(() => {
    if (isDefaultView(view)) {
      restore();
      return;
    }
    fetchView(view);
  }, [view, isDefaultView, fetchView, restore]);

  /** Re-runs the current view — the « Réessayer » button. */
  const reload = useCallback(() => {
    if (isDefaultView(view)) {
      restore();
      return;
    }
    fetchView(view);
  }, [view, isDefaultView, fetchView, restore]);

  /**
   * Adopts an answer obtained elsewhere, without going through the view state.
   *
   * For a mutation that has already invalidated the current view's data and
   * already refetched it: the caller has the fresh rows in hand, so pushing them
   * through `load` would be a second request for something it just asked for.
   * It stays in this hook so that `restore` and `reload` remain the only things
   * that know about `initialData`.
   */
  const replace = useCallback((fresh: T) => {
    requestId.current += 1;
    setData(fresh);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, reload, replace };
}
