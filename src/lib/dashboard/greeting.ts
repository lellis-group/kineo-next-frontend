import { countAwaitingDecision } from "../applications";
import { plural } from "../format";
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
 * Sous-titre informatif et déterministe : résume ce que la page affiche et
 * d'où viennent les chiffres (annonces publiées par l'utilisateur,
 * candidatures qu'il a envoyées). Remplace les messages d'accueil aléatoires.
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

  // Same derivation as the "Mes annonces" stat card below, from the same named
  // set — the two used to disagree, because this copy left FULL out.
  const activeListings = countRecruitingListings(listings);
  // Same set as the « Mes candidatures » card, so the greeting and the card
  // cannot disagree about what is still outstanding.
  const pendingApps = countAwaitingDecision(applications);

  let subtitle: string;
  if (activeListings > 0 && pendingApps > 0) {
    subtitle = `Ravi de vous revoir ! Vous avez ${activeListings} annonce${plural(activeListings)} active${plural(activeListings)} et ${pendingApps} candidature${plural(pendingApps)} en attente de décision.`;
  } else if (activeListings > 0) {
    // « en attente », not « envoyée »: the branch is reached when nothing is
    // outstanding, which is not the same as having sent nothing. A user with one
    // accepted application and no listing left has sent one.
    subtitle = `Vous avez ${activeListings} annonce${plural(activeListings)} active${plural(activeListings)}. Aucune candidature en attente pour le moment.`;
  } else if (pendingApps > 0) {
    subtitle = `Vous avez ${pendingApps} candidature${plural(pendingApps)} envoyée${plural(pendingApps)}. Aucune annonce active pour le moment.`;
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
