import { SPECIALTY_LABELS } from "../profile";
import type { ApiProfile } from "../types/api";
import type { DashboardData } from "./contracts";

function formatSpecialty(specialty: ApiProfile["specialty"]): string {
  return SPECIALTY_LABELS[specialty];
}

/**
 * The welcome subtitle: says where the member stands, without repeating figures.
 *
 * A dashboard needs each number once. The greeting now says what deserves
 * attention; the figures stay one line lower down, and there is one version of
 * them.
 *
 * The two booleans arrive rather than the collections they were counted from: the
 * greeting only ever asked whether each figure was above zero, and it used to be
 * handed both collections in order to find out — which is how a home screen came
 * to depend on reading every listing and every application.
 */
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
    // Not « les cabinets vous ont répondu »: this branch is reached by PENDING
    // too, which is precisely an application nobody has answered yet.
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
