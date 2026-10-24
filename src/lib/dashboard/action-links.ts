import type { ProfileType } from "../types/api";
import type { DashboardAction } from "./contracts";

const publishAction: DashboardAction = {
  label: "Publier une annonce",
  href: "/listings/new",
  variant: "primary",
  icon: "plus",
};

const searchAction: DashboardAction = {
  label: "Chercher un remplacement",
  href: "/listings",
  variant: "outline",
  icon: "layers",
};

const myOffersAction: DashboardAction = {
  label: "Voir mes offres",
  href: "/listings/mine",
  variant: "outline",
  icon: "layers",
};

const myApplicationsAction: DashboardAction = {
  label: "Voir mes candidatures",
  href: "/applications",
  variant: "outline",
  icon: "file",
};

/**
 * Home actions, filtered by `profileType`.
 *
 * Nothing here points at a page that does not exist: `/practices` had an action
 * of its own for an installed practice, and it 404s on both sides of the wire —
 * the practice side is `/listings/mine` until a real practice screen is built.
 */
export function adaptActions(
  profileType?: ProfileType | null,
): DashboardAction[] {
  switch (profileType) {
    case "INSTALLED":
      return [publishAction, myOffersAction];
    case "REPLACEMENT":
      return [{ ...searchAction, variant: "primary" }, myApplicationsAction];
    default:
      return [
        publishAction,
        searchAction,
        myOffersAction,
        myApplicationsAction,
      ];
  }
}
