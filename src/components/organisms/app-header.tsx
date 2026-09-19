"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/organisms/site-header";
import { signOut, useSession } from "@/lib/auth-client";
import type { UserSummary } from "@/lib/dashboard";
import type { HeaderLink } from "@/lib/navigation";
import { getMemberNav, publicNav } from "@/lib/navigation";
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
}: {
  /** Server role; null = discovery nav. Refreshed via router.refresh(). */
  initialProfileType: ProfileType | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const [profileType, setProfileType] = useState<ProfileType | null>(
    initialProfileType,
  );

  // Server is the source of truth: follow layout revalidation.
  useEffect(() => {
    setProfileType(initialProfileType);
  }, [initialProfileType]);

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
