import type { ApplicationsData } from "../applications";
import { awaitingDecisionCount } from "../applications";
import { formatDateRange, plural } from "../format";
import type { MyListingsData } from "../listings";
import { recruitingCount } from "../listings";
import type { DashboardStat } from "./contracts";

/** The three figure cards, all from the server's totals rather than rows on hand. */
export function adaptStats(
  listings: MyListingsData,
  applications: ApplicationsData,
): DashboardStat[] {
  const activeListings = recruitingCount(listings.counts);

  const open = listings.counts.OPEN;
  const discussion = listings.counts.IN_DISCUSSION;
  const full = listings.counts.FULL;

  const awaitingDecision = awaitingDecisionCount(applications.counts);

  // Keep in step with `AWAITING_DECISION_STATUSES`: nothing enforces it.
  const pendingCount = applications.counts.PENDING;
  const shortlistedCount = applications.counts.SHORTLISTED;

  const appsBreakdown = [
    `${pendingCount} en attente`,
    `${shortlistedCount} présélectionnée${plural(shortlistedCount)}`,
  ].filter((part) => !part.startsWith("0 "));

  const unseenApps = applications.unseenOpenCount;

  // Every recruiting status, so the breakdown sums to the headline.
  const breakdown = [
    `${open} ouverte${plural(open)}`,
    `${discussion} en discussion`,
    `${full} complet${plural(full)}`,
  ].filter((part) => !part.startsWith("0 "));

  // Server-answered: the soonest recruiting posting still to come.
  const upcoming = listings.nextRecruitingListing;

  const nextReplacement: DashboardStat = upcoming
    ? {
        id: "next-replacement",
        title: "Prochain remplacement",
        value: formatDateRange(upcoming.startDate, upcoming.endDate),
        label: "période à couvrir par un remplaçant",
        detail: upcoming.title,
        icon: "calendar",
      }
    : {
        id: "next-replacement",
        title: "Prochain remplacement",
        value: "Aucun",
        label: "aucune période à couvrir",
        detail: "Publiez une annonce pour trouver un remplaçant",
        icon: "calendar",
      };

  return [
    {
      id: "listings",
      title: "Mes annonces",
      value: `${activeListings}`,
      label:
        activeListings > 0
          ? "en recherche d'un remplaçant"
          : "aucune en recherche de remplaçant",
      detail: breakdown.length > 0 ? breakdown.join(" · ") : undefined,
      icon: "layers",
    },
    {
      id: "applications",
      title: "Mes candidatures",
      value: `${awaitingDecision}`,
      // « décision », not « réponse »: a shortlisted application was answered.
      label:
        awaitingDecision > 0
          ? "en attente de décision du cabinet"
          : "aucune en attente de décision",
      detail:
        [
          appsBreakdown.join(" · "),
          unseenApps > 0
            ? `dont ${unseenApps} pas encore vue${plural(unseenApps)} par le cabinet`
            : undefined,
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      icon: "users",
    },
    nextReplacement,
  ];
}
