"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/organisms/site-header";
import { signOut, useSession } from "@/lib/auth-client";
import type { UserSummary } from "@/lib/dashboard";
import type { HeaderLink } from "@/lib/navigation";
import { getMemberNav, publicNav } from "@/lib/navigation";
import { fetchMyProfile } from "@/lib/profile-service";
import type { ServerAuthState } from "@/lib/server-auth";
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

/**
 * Authenticated-aware header.
 *
 * The rule that keeps it from flickering: the server already resolved the
 * whole state, so the header renders from `initialAuth` and the client session
 * only ever *confirms* it. Two consequences:
 *
 * - while the client session loads (`isPending`) the server state is replayed
 *   verbatim, which also keeps the first client render identical to the SSR
 *   markup — no hydration mismatch;
 * - the client session is never allowed to promote `anonymous` to `member`.
 *   It may demote a member (sign-out elsewhere) but not the reverse, because
 *   only the server saw the cookie. A stale client cache could otherwise
 *   resurrect account controls for a signed-out user.
 *
 * The role follows the same rule: it is refreshed on navigation (the layout
 * payload is cached, so a prop alone cannot signal a role change) and never
 * reset to null while the fetch is in flight, so the nav cannot flicker back
 * to the default links and forward again.
 */
export function AppHeader({ initialAuth }: { initialAuth: ServerAuthState }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const [role, setRole] = useState<ProfileType | null>(
    initialAuth.status === "member" ? initialAuth.role : null,
  );
  const prevPathnameRef = useRef(pathname);
  /**
   * True when the server could not resolve the role. Distinguishes "no role
   * yet" from "role unknown" — only the latter is worth re-checking, and
   * re-checking a member with no profile on every navigation is a wasted call.
   */
  const needsConfirmRef = useRef(
    initialAuth.status === "member" && initialAuth.role === null,
  );

  // Follow server revalidation when it delivers a new prop.
  useEffect(() => {
    if (initialAuth.status === "member") {
      setRole(initialAuth.role);
      needsConfirmRef.current = initialAuth.role === null;
    }
  }, [initialAuth]);

  const clientUser = session?.user;

  // The client session has one authority: proving the session is *gone*.
  // Until it resolves we cannot claim that, so the server answer holds.
  // A stale client cache therefore cannot resurrect account controls for
  // someone who just signed out.
  const isSignedIn =
    initialAuth.status === "member" && (isPending || Boolean(clientUser));

  const serverName = initialAuth.status === "member" ? initialAuth.name : null;

  // The server name is the SSR-stable one and is replayed while pending, so
  // the first client render matches the server markup exactly.
  const name =
    isPending || !clientUser
      ? serverName
      : clientUser.name?.trim() || serverName;

  // Refresh the role on navigation only; mount is covered by the server prop
  // unless it came back unresolved.
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
        // Only ever upgrade or keep: a null here means "no profile", which is
        // what the server already reported, so there is nothing to repaint.
        setRole((current) => profile?.profileType ?? current);
      })
      .catch(() => {
        if (!cancelled) needsConfirmRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [initialAuth.status, isSignedIn, pathname]);

  if (isSignedIn && name) {
    const identity: UserSummary = { name, subtitle: "Professionnel de santé" };
    const links = getMemberNav(role);
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
