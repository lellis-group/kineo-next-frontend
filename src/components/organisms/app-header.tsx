"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/organisms/site-header";
import { signOut, useSession } from "@/lib/auth-client";
import type { UserSummary } from "@/lib/dashboard";
import type { HeaderLink } from "@/lib/navigation";
import { getMemberNav, publicNav } from "@/lib/navigation";
import { fetchMyProfile } from "@/lib/profile-service";
import type { ProfileType } from "@/lib/types/api";

/** Longest prefix wins, so /listings/mine beats /listings. */
function resolveActiveLink(
  links: HeaderLink[],
  pathname: string,
): HeaderLink | undefined {
  const activeSegments = pathname.split("/").filter(Boolean);
  let best: HeaderLink | undefined;
  let bestLength = -1;
  for (const link of links) {
    if (link.href === "/") {
      if (activeSegments.length === 0 && bestLength < 0) {
        best = link;
        bestLength = 0;
      }
      continue;
    }
    // Hash links never match.
    if (link.href.startsWith("#")) continue;
    const linkSegments = link.href.split("/").filter(Boolean);
    const matches =
      activeSegments.length >= linkSegments.length &&
      linkSegments.every((seg, i) => activeSegments[i] === seg);
    if (matches && linkSegments.length > bestLength) {
      best = link;
      bestLength = linkSegments.length;
    }
  }
  return best;
}

/** Session + role header, UI in SiteHeader. */
export function AppHeader({
  initialProfileType,
  initialUserName,
}: {
  /** Server role for first paint; null = discovery nav. */
  initialProfileType: ProfileType | null;
  /** Server user name for first paint; mirrors SSR during session load. */
  initialUserName: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  // While the client session loads, replay the server snapshot so the first
  // client render matches SSR exactly (no hydration mismatch).
  const user = isPending
    ? initialUserName
      ? { name: initialUserName }
      : undefined
    : session?.user;
  const [profileType, setProfileType] = useState<ProfileType | null>(
    initialProfileType,
  );
  const prevPathnameRef = useRef(pathname);
  // True while the server role is missing: the server fetch may have failed
  // while the client can still reach the API — confirm once at mount.
  const needsConfirmRef = useRef(initialProfileType === null);

  // Follow server revalidation when it delivers a new prop.
  useEffect(() => {
    setProfileType(initialProfileType);
  }, [initialProfileType]);

  // Refetch on navigation only (mount is covered by the server prop, except
  // when it came back null): the layout payload is cached across
  // same-layout navigations, so the prop alone can't signal a role change
  // (e.g. /profile/edit -> /profile).
  useEffect(() => {
    if (!user) {
      setProfileType(null);
      return;
    }
    const navigated = prevPathnameRef.current !== pathname;
    prevPathnameRef.current = pathname;
    if (!navigated && !needsConfirmRef.current) return;
    let cancelled = false;
    fetchMyProfile()
      .then((profile) => {
        if (cancelled) return;
        needsConfirmRef.current = false;
        setProfileType(profile?.profileType ?? null);
      })
      .catch(() => {
        // Keep last known nav when the profile can't load.
        if (!cancelled) needsConfirmRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  if (user) {
    const identity: UserSummary = {
      name: user.name || "Professionnel",
      subtitle: "Professionnel de santé",
    };

    const links = getMemberNav(profileType);
    const activeLink = resolveActiveLink(links, pathname);

    return (
      <SiteHeader
        links={links}
        activeHref={activeLink?.href}
        user={identity}
        pathname={pathname}
        onSignOut={async () => {
          try {
            await signOut();
          } finally {
            // Always leave the member area, even if sign-out fails.
            router.push("/signup");
            router.refresh();
          }
        }}
      />
    );
  }

  return <SiteHeader links={publicNav} pathname={pathname} />;
}
