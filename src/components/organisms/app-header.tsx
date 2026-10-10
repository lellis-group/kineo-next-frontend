"use client";

import { usePathname, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/organisms/site-header";
import { signOut, useSession } from "@/lib/auth-client";
import type { UserSummary } from "@/lib/dashboard";
import { useRoleRefresh } from "@/lib/hooks/use-role-refresh";
import { getMemberNav, publicNav, resolveActiveLink } from "@/lib/navigation";
import type { ServerAuthState } from "@/lib/server-auth";

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

  const clientUser = session?.user;

  // The client session has one authority: proving the session is *gone*.
  // Until it resolves we cannot claim that, so the server answer holds.
  // A stale client cache therefore cannot resurrect account controls for
  // someone who just signed out.
  const isSignedIn =
    initialAuth.status === "member" && (isPending || Boolean(clientUser));

  const role = useRoleRefresh(initialAuth, pathname, isSignedIn);

  const serverName = initialAuth.status === "member" ? initialAuth.name : null;

  // The server name is the SSR-stable one and is replayed while pending, so
  // the first client render matches the server markup exactly.
  const name =
    isPending || !clientUser
      ? serverName
      : clientUser.name?.trim() || serverName;

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
            //
            // `/signin`, not `/signup`: the account the user just left exists
            // and they hold its credentials, so the next thing they want is to
            // log back in. Landing on « Créer un compte » reads as being asked
            // to register again, and the way back would be to submit the
            // signup form and discover the « Se connecter avec cet e-mail »
            // escape hatch. `/signin` links to `/signup` in one click, so
            // registration stays reachable with the funnel pointing the right
            // way.
            router.push("/signin");
            router.refresh();
          }
        }}
      />
    );
  }

  return <SiteHeader links={publicNav} pathname={pathname} />;
}
