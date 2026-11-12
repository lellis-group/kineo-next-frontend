"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signInOnExpiredSession } from "@/lib/session-redirect";
import { useRaceGuard } from "./use-race-guard";

/**
 * One resource, paged and filtered, seeded from the server payload.
 *
 * The default view restores `initialData` (the server's answer for it); other
 * views fetch. Every response is checked against a request id, and superseded
 * requests are aborted, so a slow answer can't overwrite the current view.
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
  view: V;
  isDefaultView: (view: V) => boolean;
  /** Fetches one view. Rejections surface as `error`, never as a throw. */
  load: (view: V, init?: RequestInit) => Promise<T>;
  onLoaded?: () => void;
  onRestored?: () => void;
  /**
   * The URL is the source of truth and the server re-renders every view
   * (`/listings`): each fresh `initialData` is adopted and nothing is fetched
   * client-side.
   */
  seedFromServer?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  // Refs, so inline arrows at the call site don't re-run the effect.
  const afterLoad = useRef(onLoaded);
  const afterRestore = useRef(onRestored);
  afterLoad.current = onLoaded;
  afterRestore.current = onRestored;

  const defaultView = useRef(isDefaultView);
  defaultView.current = isDefaultView;

  const raceGuard = useRaceGuard();
  const { start, isStale, settled, revoke } = raceGuard;

  useEffect(() => revoke, [revoke]);

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
          // Aborted: the reader has already moved to the next view.
          if (controller.signal.aborted) return;
          if (signInOnExpiredSession(err, router)) return;
          setError(err);
        });
    },
    [start, isStale, settled, load, router],
  );

  const restore = useCallback(() => {
    revoke();
    setData(initialData);
    setError(null);
    setLoading(false);
    afterRestore.current?.();
  }, [revoke, initialData]);

  /** The first run always adopts `initialData`, the server's opening answer. */
  const hydrated = useRef(false);

  useEffect(() => {
    // Server-seeded: adopt the server's rows for this exact view.
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

  const reload = useCallback(() => {
    if (defaultView.current(view)) {
      restore();
      return;
    }
    fetchView(view);
  }, [view, fetchView, restore]);

  /** Adopts rows a mutation already refetched, without a second request. */
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
