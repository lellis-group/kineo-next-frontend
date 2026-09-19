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

const myPracticesAction: DashboardAction = {
  label: "Gérer mes cabinets",
  href: "/practices",
  variant: "outline",
};

/** Home actions, filtered by `profileType`. */
export function adaptActions(
  profileType?: ProfileType | null,
): DashboardAction[] {
  switch (profileType) {
    case "INSTALLED":
      return [publishAction, myOffersAction, myPracticesAction];
    case "REPLACEMENT":
      return [{ ...searchAction, variant: "primary" }, myApplicationsAction];
    default:
      return [
        publishAction,
        searchAction,
        myOffersAction,
        myApplicationsAction,
        myPracticesAction,
      ];
  }
}
