"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signInOnExpiredSession } from "@/lib/session-redirect";
import { useRaceGuard } from "./use-race-guard";

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
 *
 * The cancellation guard itself now lives in `useRaceGuard`, shared with
 * `useExpandedCandidates` — no call-site codes `requestId` + `AbortController`
 * by hand anymore.
 */
export function usePaginatedResource<T, V>({
  initialData,
  view,
  isDefaultView,
  load,
  onLoaded,
  onRestored,
  seedFromServer,
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
  /**
   * True when the screen's URL is the source of truth and the server answers
   * every view by re-rendering — `/listings`, whose filters and page live in the
   * query string. Then `initialData` is never stale: it is always the server's
   * answer for the current view, delivered on mount and again on every URL
   * change, so the hook adopts each fresh `initialData` and never fetches
   * client-side — the server already did. Left off, the hook behaves as it
   * always has: `initialData` is the default view only, and every other view is
   * client state that fetches. The three console screens leave it off.
   */
  seedFromServer?: boolean;
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

  /** Cancels in-flight reads, starts races, and stamps stale answers. */
  const raceGuard = useRaceGuard();
  const { start, isStale, settled, revoke } = raceGuard;

  const fetchView = useCallback(
    (target: V) => {
      const { controller, mine } = start();

      setError(null);
      setLoading(true);

      load(target, { signal: controller.signal })
        .then((loaded) => {
          if (isStale(mine)) return;
          settled();
          setData(loaded);
          setLoading(false);
          afterLoad.current?.();
        })
        .catch((err) => {
          if (isStale(mine)) return;
          settled();
          setLoading(false);
          // The abort above, not a broken endpoint: nothing to show and nothing
          // to say, because the reader is already looking at the next view's rows.
          if (controller.signal.aborted) return;
          if (signInOnExpiredSession(err, router)) return;
          setError(err);
        });
    },
    [start, isStale, settled, load, router],
  );

  const restore = useCallback(() => {
    // Invalidate any request still in flight: its answer describes a view the
    // reader has already left.
    revoke();
    setData(initialData);
    setError(null);
    setLoading(false);
    afterRestore.current?.();
  }, [revoke, initialData]);

  /**
   * True once the hook has adopted the server's opening answer.
   *
   * Only used on the client-driven path (the three console screens). The first
   * effect run always restores `initialData`, whatever the view is, because
   * `initialData` is by contract the server's answer for the view this screen
   * starts on — which on those screens is always the default one, so this
   * replaces a `restore()` the `isDefaultView` branch would already have made,
   * with no behaviour change. The server-seeded path below has no such branch.
   */
  const hydrated = useRef(false);

  useEffect(() => {
    // Server-seeded: the URL is the source of truth and the server answered this
    // exact view. Adopt its rows rather than refetching them over the wire. This
    // runs on mount and again on every URL change, because each one re-renders
    // the route with a fresh `initialData` — the reference is the signal that new
    // rows have arrived, and there is never a client fetch on this path.
    if (seedFromServer) {
      revoke();
      setData(initialData);
      setError(null);
      setLoading(false);
      afterRestore.current?.();
      return;
    }

    if (!hydrated.current) {
      hydrated.current = true;
      restore();
      return;
    }
    if (isDefaultView(view)) {
      restore();
      return;
    }
    fetchView(view);
  }, [
    view,
    initialData,
    isDefaultView,
    fetchView,
    restore,
    seedFromServer,
    revoke,
  ]);

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
  const replace = useCallback(
    (fresh: T) => {
      revoke();
      setData(fresh);
      setError(null);
      setLoading(false);
    },
    [revoke],
  );

  return { data, error, loading, reload, replace };
}
