"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { signInOnExpiredSession } from "@/lib/session-redirect";

/** A server-seeded value that can be re-read on demand, with error and session handling. */
export function useReloadable<T>(initialData: T, load: () => Promise<T>) {
  const router = useRouter();
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [reloading, setReloading] = useState(false);

  // Only the latest reload may write.
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
