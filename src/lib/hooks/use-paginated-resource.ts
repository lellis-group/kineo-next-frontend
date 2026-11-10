"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signInOnExpiredSession } from "@/lib/session-redirect";
import { useRaceGuard } from "./use-race-guard";

/**
 * One resource, paged and filtered, seeded from the server payload — the shape
 * the three console screens share.
 *
 * Two rules found the hard way, both now structural:
 *
 * - the default view is fetched like any other. Skipping the fetch when the
 *   filters are back at their default means the *reset* of the previous view
 *   never happens either: the old bucket's rows stay on screen under chips that
 *   no longer name them. `initialData` is the default view's answer;
 * - every response is checked against a request id (and the superseded request
 *   *aborted*, via the signal handed to `load`) before it may write. Chips
 *   switch faster than the network answers, and a slow answer to the view the
 *   reader just left must not overwrite the one they are on.
 *
 * The race guard itself lives in `useRaceGuard`.
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

  /**
   * The default-view test is read through a ref for the same reason as the two
   * callbacks above. Two of the three call sites pass it as an inline arrow, and
   * it sits in this hook's effect dependencies: a fresh identity on every render
   * would re-run the effect, which is a refetch storm on any non-default view.
   * React Compiler happens to memoise those arrows today, but correctness must
   * not depend on it.
   */
  const defaultView = useRef(isDefaultView);
  defaultView.current = isDefaultView;

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
    if (defaultView.current(view)) {
      restore();
      return;
    }
    fetchView(view);
  }, [view, initialData, fetchView, restore, seedFromServer, revoke]);

  /** Re-runs the current view — the « Réessayer » button. */
  const reload = useCallback(() => {
    if (defaultView.current(view)) {
      restore();
      return;
    }
    fetchView(view);
  }, [view, fetchView, restore]);

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
