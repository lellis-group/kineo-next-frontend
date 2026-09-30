import { countAwaitingDecision } from "../applications";
import { countRecruitingListings } from "../listings";
import { SPECIALTY_LABELS } from "../profile";
import type {
  ApiApplication,
  ApiProfile,
  ApiReplacementListing,
} from "../types/api";
import type { DashboardData } from "./contracts";

function formatSpecialty(specialty: ApiProfile["specialty"]): string {
  return SPECIALTY_LABELS[specialty];
}

/**
 * Sous-titre de bienvenue : dit où en est le membre, sans répéter les chiffres.
 *
 * Il les répétait — « Vous avez 2 annonces actives et 4 candidatures en
 * attente » — immédiatement au-dessus des deux cartes qui affichent
 * exactement 2 et 4, avec la même décomposition en détail. Même source de
 * dérive que le reste de l'écran : les deux phrases étaient calculées par deux
 * chemins distincts, ce qui est précisément pourquoi « FULL » manquait d'un
 * côté et pas de l'autre, et pourquoi le greeting et la carte donnaient des
 * chiffres différents.
 *
 * Un tableau de bord n'a besoin qu'une fois de chaque nombre. Le greeting dit
 * maintenant ce qui mérite l'attention ; les chiffres restent une ligne plus
 * bas, et il n'y a qu'une version.
 */
export function adaptGreeting(
  profile: ApiProfile | null,
  userName: string | undefined,
  listings: ApiReplacementListing[],
  applications: ApiApplication[],
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
  const recruiting = countRecruitingListings(listings) > 0;
  const outstanding = countAwaitingDecision(applications) > 0;

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
