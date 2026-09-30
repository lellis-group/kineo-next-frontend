import {
  AWAITING_DECISION_STATUSES,
  countAwaitingDecision,
} from "../applications";
import { formatDateRange, plural } from "../format";
import { countRecruitingListings } from "../listings";
import type { ApiApplication, ApiReplacementListing } from "../types/api";
import type { DashboardStat } from "./contracts";

export function adaptStats(
  listings: ApiReplacementListing[],
  applications: ApiApplication[],
): DashboardStat[] {
  // OPEN / IN_DISCUSSION / FULL — the same set the listings screen calls
  // « En cours » and the listing card uses to offer close/cancel.
  const activeListings = countRecruitingListings(listings);

  const open = listings.filter((l) => l.status === "OPEN").length;
  const discussion = listings.filter(
    (l) => l.status === "IN_DISCUSSION",
  ).length;
  const full = listings.filter((l) => l.status === "FULL").length;
  // PENDING + SHORTLISTED — a shortlisted application is one the practice put
  // forward but has not yet decided on, so it is still outstanding. Counting
  // PENDING alone reported zero for anyone who had been shortlisted, which reads
  // as "nothing left to wait for" while the cabinet is still choosing.
  const awaitingDecision = countAwaitingDecision(applications);

  // A subset of the figure above: the same statuses, narrowed to the ones the
  // practice has not opened yet. Kept on the same set so « dont N » can never
  // outnumber the total it qualifies.
  const unseenApps = applications.filter(
    (a) => !a.viewedAt && AWAITING_DECISION_STATUSES.has(a.status),
  ).length;

  // Every recruiting status, so the breakdown sums to the headline. Omitting a
  // status the headline counts would show a number that does not add up, which
  // is the same class of bug as the headline itself being wrong.
  const breakdown = [
    `${open} ouverte${plural(open)}`,
    `${discussion} en discussion`,
    `${full} complet${plural(full)}`,
  ].filter((part) => !part.startsWith("0 "));

  const now = new Date();
  const upcoming = listings
    .filter((l) => new Date(l.startDate) > now && l.status !== "CANCELLED")
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )[0];

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
      label: `annonce${plural(activeListings)} active${plural(activeListings)} · en recherche de remplaçant`,
      detail: breakdown.length > 0 ? breakdown.join(" · ") : undefined,
      icon: "layers",
    },
    {
      id: "applications",
      title: "Mes candidatures",
      value: `${awaitingDecision}`,
      // « décision » rather than « réponse »: a shortlisted application has
      // already been answered — the cabinet put it forward — what is still
      // outstanding is whether anyone gets picked.
      label: `candidature${plural(awaitingDecision)} envoyée${plural(awaitingDecision)} · en attente de décision du cabinet`,
      detail:
        unseenApps > 0
          ? `dont ${unseenApps} pas encore vue${plural(unseenApps)} par le cabinet`
          : undefined,
      icon: "users",
    },
    nextReplacement,
  ];
}
