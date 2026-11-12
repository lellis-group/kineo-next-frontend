import { SPECIALTY_LABELS } from "../profile";
import type { ApiProfile } from "../types/api";
import type { DashboardData } from "./contracts";

function formatSpecialty(specialty: ApiProfile["specialty"]): string {
  return SPECIALTY_LABELS[specialty];
}

/** The welcome subtitle: where the member stands, without repeating the figures. */
export function adaptGreeting(
  profile: ApiProfile | null,
  userName: string | undefined,
  activity: { recruiting: boolean; outstanding: boolean },
): DashboardData["greeting"] {
  const displayName =
    userName ||
    (profile?.rppsNumber
      ? `Dr. ${profile.rppsNumber.slice(-4)}`
      : "Professionnel");

  const meta = profile
    ? [profile.city, formatSpecialty(profile.specialty)]
        .filter(Boolean)
        .join(" · ")
    : "";

  // Only used to pick the line, never printed: the cards are the figures.
  const { recruiting, outstanding } = activity;

  let subtitle: string;
  if (recruiting && outstanding) {
    subtitle =
      "Annonces en ligne, candidatures en cours. Les décisions des cabinets apparaissent au fil de votre activité.";
  } else if (recruiting) {
    subtitle =
      "Vos annonces sont en ligne. Les candidatures reçues apparaissent au fil de votre activité.";
  } else if (outstanding) {
    // PENDING reaches this branch too, so don't claim an answer.
    subtitle =
      "Vos candidatures sont en cours. Les décisions des cabinets apparaissent au fil de votre activité.";
  } else {
    subtitle =
      "Créez votre première annonce ou candidatez à un remplacement pour démarrer.";
  }

  return {
    name: displayName,
    subtitle,
    meta: meta || undefined,
  };
}
