"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import type { UserSummary } from "@/lib/dashboard";
import { useRoleRefresh } from "@/lib/hooks/use-role-refresh";
import {
  getMemberNav,
  type HeaderLink,
  publicNav,
  resolveActiveLink,
} from "@/lib/navigation";
import type { ServerAuthState } from "@/lib/server-auth";

interface HeaderState {
  pathname: string;
  links: HeaderLink[];
  activeHref?: string;
}

/** What the header can draw, given the server's answer and the client session. */
export type HeaderAuth =
  | { status: "pending" }
  | (HeaderState & { status: "anonymous" })
  | (HeaderState & {
      status: "member";
      user: UserSummary;
      onSignOut: () => Promise<void>;
    });

/**
 * Resolves the header's identity. It renders from the server's `initialAuth`,
 * and the client session may only confirm it:
 *
 * - while pending, the server state is replayed (no hydration mismatch);
 * - the client may demote a member, never promote `anonymous`;
 * - only a successful read demotes — a failed one (e.g. a 429) proves nothing;
 * - over `unavailable`, the client may confirm the session; until then the
 *   header stays pending.
 *
 * The role is refreshed on navigation and never reset to null mid-fetch.
 */
export function useHeaderAuth(initialAuth: ServerAuthState): HeaderAuth {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, error } = useSession();

  const clientUser = session?.user;
  const clientUnsure = isPending || Boolean(error);

  // Over `unavailable`, the server saw a cookie but could not ask about it.
  const isSignedIn =
    initialAuth.status === "member"
      ? clientUnsure || Boolean(clientUser)
      : initialAuth.status === "unavailable" && Boolean(clientUser);

  const role = useRoleRefresh(initialAuth, pathname, isSignedIn);

  const serverName = initialAuth.status === "member" ? initialAuth.name : null;
  const name =
    clientUnsure || !clientUser
      ? serverName
      : clientUser.name?.trim() || serverName || "Professionnel";

  if (isSignedIn && name) {
    const links = getMemberNav(role);

    return {
      status: "member",
      pathname,
      links,
      activeHref: resolveActiveLink(links, pathname)?.href,
      user: { name, subtitle: "Professionnel de santé" },
      onSignOut: async () => {
        try {
          await signOut();
        } finally {
          // `/signin`, not `/signup`: the account still exists.
          router.push("/signin");
          router.refresh();
        }
      },
    };
  }

  // Neither server nor client can say yet: claim nothing.
  if (initialAuth.status === "unavailable" && clientUnsure) {
    return { status: "pending" };
  }

  return {
    status: "anonymous",
    pathname,
    links: publicNav,
  };
}
