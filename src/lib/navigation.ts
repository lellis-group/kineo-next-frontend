/**
 * Structural navigation — editorial content lives in `lib/marketing.ts`.
 * Member nav is role-based (`profileType`); null falls back to discovery.
 */

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

// English routes, French labels.
const replacementNav: HeaderLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Annonces", href: "/listings" },
  { label: "Mes candidatures", href: "/applications" },
  { label: "Mon Profil", href: "/profile" },
];

const installedNav: HeaderLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Mes offres", href: "/listings/mine" },
  { label: "Mes cabinets", href: "/practices" },
  { label: "Mon Profil", href: "/profile" },
];

const bothNav: HeaderLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Annonces", href: "/listings" },
  { label: "Mes offres", href: "/listings/mine" },
  { label: "Mes candidatures", href: "/applications" },
  { label: "Mes cabinets", href: "/practices" },
  { label: "Mon Profil", href: "/profile" },
];

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
