import type { ProfileType } from "./types/api";

export interface HeaderLink {
  label: string;
  href: string;
}

export const publicNav: HeaderLink[] = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Comment ça marche", href: "#how-it-works" },
  { label: "Tarifs", href: "#" },
];

// English routes, French labels. No `/practices` entry: the page doesn't exist.
const replacementNav: HeaderLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Annonces", href: "/listings" },
  { label: "Mes candidatures", href: "/applications" },
  { label: "Mon Profil", href: "/profile" },
];

const installedNav: HeaderLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Mes offres", href: "/listings/mine" },
  { label: "Mon Profil", href: "/profile" },
];

const bothNav: HeaderLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Annonces", href: "/listings" },
  { label: "Mes offres", href: "/listings/mine" },
  { label: "Mes candidatures", href: "/applications" },
  { label: "Mon Profil", href: "/profile" },
];

/** Member nav by role; a member without a profile gets the replacement links. */
export function getMemberNav(profileType?: ProfileType | null): HeaderLink[] {
  switch (profileType) {
    case "INSTALLED":
      return installedNav;
    case "BOTH":
      return bothNav;
    default:
      return replacementNav;
  }
}

/** Longest prefix wins, so `/listings/mine` beats `/listings`. */
export function resolveActiveLink(
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
