"use client";

import { useEffect, useRef, useState } from "react";
import { fetchMyProfile } from "@/lib/profile-service";
import type { ServerAuthState } from "@/lib/server-auth";
import type { ProfileType } from "@/lib/types/api";

/**
 * Keeps the member's role in sync with the server: refreshed on navigation and
 * whenever the server delivers a new `initialAuth` prop. The role is never reset
 * to null while the fetch is in flight, so the nav cannot flicker.
 */
export function useRoleRefresh(
  initialAuth: ServerAuthState,
  pathname: string,
  isSignedIn: boolean,
): ProfileType | null {
  const [role, setRole] = useState<ProfileType | null>(
    initialAuth.status === "member" ? initialAuth.role : null,
  );

  const prevPathnameRef = useRef(pathname);
  const needsConfirmRef = useRef(
    initialAuth.status === "member" && initialAuth.role === null,
  );

  useEffect(() => {
    if (initialAuth.status === "member") {
      setRole(initialAuth.role);
      needsConfirmRef.current = initialAuth.role === null;
    }
  }, [initialAuth]);

  useEffect(() => {
    if (initialAuth.status !== "member" || !isSignedIn) {
      return;
    }

    const navigated = prevPathnameRef.current !== pathname;
    prevPathnameRef.current = pathname;

    if (!navigated && !needsConfirmRef.current) {
      return;
    }

    let cancelled = false;
    fetchMyProfile()
      .then((profile) => {
        if (cancelled) return;
        needsConfirmRef.current = false;
        setRole((current) => profile?.profileType ?? current);
      })
      .catch(() => {
        if (!cancelled) needsConfirmRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [initialAuth.status, isSignedIn, pathname]);

  return role;
}
