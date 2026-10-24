"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/**
 * Reloadable data — a server-seeded value that can be re-read on demand, with
 * the same error and expired-session handling the dashboard used to inline.
 *
 * The dashboard container inlined `data`/`error`/`reloading` state plus a
 * `reload` callback; extracting it means the container only decides what to
 * render, and the reload logic lives here once.
 */
export function useReloadable<T>(initialData: T, load: () => Promise<T>) {
  const router = useRouter();
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [reloading, setReloading] = useState(false);

  const reload = useCallback(() => {
    setReloading(true);
    setError(null);

    load()
      .then((fresh) => {
        setData(fresh);
        setReloading(false);
      })
      .catch((err) => {
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
