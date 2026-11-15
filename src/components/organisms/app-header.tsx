"use client";

import { HeaderSkeleton } from "@/components/organisms/header-skeleton";
import { SiteHeader } from "@/components/organisms/site-header";
import { useHeaderAuth } from "@/lib/hooks/use-header-auth";
import type { ServerAuthState } from "@/lib/server-auth";

/** The header: which identity it shows is `useHeaderAuth`'s business. */
export function AppHeader({ initialAuth }: { initialAuth: ServerAuthState }) {
  const auth = useHeaderAuth(initialAuth);

  if (auth.status === "pending") {
    return <HeaderSkeleton />;
  }

  if (auth.status === "anonymous") {
    return <SiteHeader links={auth.links} pathname={auth.pathname} />;
  }

  return (
    <SiteHeader
      links={auth.links}
      activeHref={auth.activeHref}
      user={auth.user}
      pathname={auth.pathname}
      onSignOut={auth.onSignOut}
    />
  );
}
