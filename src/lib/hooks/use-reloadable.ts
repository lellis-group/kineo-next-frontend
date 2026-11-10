"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/**
 * Reloadable data — a server-seeded value that can be re-read on demand, with
 * the same error and expired-session handling.
 *
 * The container keeps only the decision of what to render; the
 * `data`/`error`/`reloading` trio and the `reload` plumbing live here once,
 * since every console screen needs exactly that trio.
 */
export function useReloadable<T>(initialData: T, load: () => Promise<T>) {
  const router = useRouter();
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [reloading, setReloading] = useState(false);

  // Only the latest reload may write: two reloads in quick succession can
  // answer out of order, and the older answer must not land last.
  const latest = useRef(0);

  const reload = useCallback(() => {
    const mine = ++latest.current;
    setReloading(true);
    setError(null);

    load()
      .then((fresh) => {
        if (mine !== latest.current) return;
        setData(fresh);
        setReloading(false);
      })
      .catch((err) => {
        if (mine !== latest.current) return;
        if (signInOnExpiredSession(err, router)) {
          setReloading(false);
          return;
        }
        setError(err);
        setReloading(false);
      });
  }, [load, router]);

  return { data, error, reloading, reload };
}
