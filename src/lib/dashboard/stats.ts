import type { ApplicationsData } from "../applications";
import { awaitingDecisionCount } from "../applications";
import { formatDateRange, plural } from "../format";
import type { MyListingsData } from "../listings";
import { recruitingCount } from "../listings";
import type { DashboardStat } from "./contracts";

/**
 * The three figures cards.
 *
 * Everything counted here comes from the server's totals rather than from the
 * rows on hand, and that is the point of the exercise: the dashboard used to page
 * the member's whole collection — up to twenty requests — to count it, and
 * reported figures that were short past the last page.
 *
 * Nothing here reads a row. « Prochain remplacement » once did — it asks for the
 * soonest period still to come, which no breakdown of statuses can answer — and
 * the server now answers it beside the counts, over the whole collection rather
 * than over the hundred most recent postings.
 */
export function adaptStats(
  listings: MyListingsData,
  applications: ApplicationsData,
): DashboardStat[] {
  const activeListings = recruitingCount(listings.counts);

  const open = listings.counts.OPEN;
  const discussion = listings.counts.IN_DISCUSSION;
  const full = listings.counts.FULL;

  // PENDING + SHORTLISTED — a shortlisted application is one the practice put
  // forward but has not yet decided on, so it is still outstanding. Counting
  // PENDING alone reported zero for anyone who had been shortlisted, which reads
  // as "nothing left to wait for" while the cabinet is still choosing.
  const awaitingDecision = awaitingDecisionCount(applications.counts);

  // The two statuses behind that total, broken out so the reader can tell a
  // request nobody has opened yet from one the practice has already put forward —
  // the same shape as the listings breakdown below: total above, split below.
  //
  // Kept adjacent to `AWAITING_DECISION_STATUSES` on purpose. A status added to
  // that set counts in the headline whether or not it is named here, so this list
  // has to move with it; nothing enforces that today.
  const pendingCount = applications.counts.PENDING;
  const shortlistedCount = applications.counts.SHORTLISTED;

  const appsBreakdown = [
    // « en attente » is invariable — no plural suffix on either count.
    `${pendingCount} en attente`,
    `${shortlistedCount} présélectionnée${plural(shortlistedCount)}`,
  ].filter((part) => !part.startsWith("0 "));

  // A subset of the figure above: the same statuses, narrowed to the ones the
  // practice has not opened yet. Server-counted, so it describes every
  // outstanding application and not the page of them that came back.
  const unseenApps = applications.unseenOpenCount;

  // Every recruiting status, so the breakdown sums to the headline. Omitting a
  // status the headline counts would show a number that does not add up, which is
  // the same class of bug as the headline itself being wrong.
  const breakdown = [
    `${open} ouverte${plural(open)}`,
    `${discussion} en discussion`,
    `${full} complet${plural(full)}`,
  ].filter((part) => !part.startsWith("0 "));

  // Only a posting that is actually recruiting can be the next replacement to
  // cover. The server draws that line — the statuses it considers in play, and
  // `startDate` in the future — and answers with the soonest one, or with nothing
  // when there is nothing to come. It used to be found here, by walking the
  // member's postings and comparing dates.
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
      // The label states what the figure means, not what the noun is: "Mes
      // annonces" above already says which noun, so repeating it left the line
      // reading like a fragment. And it is written for zero, where the earlier
      // version described 0 as "annonce active · en recherche de remplaçant".
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
      // « décision » rather than « réponse »: a shortlisted application has
      // already been answered — the cabinet put it forward — what is still
      // outstanding is whether anyone gets picked.
      label:
        awaitingDecision > 0
          ? "en attente de décision du cabinet"
          : "aucune en attente de décision",
      // Split by status, then the unread count as a qualifier on the total. Both
      // are kept: the split is what says which requests are still untouched, and
      // the qualifier is the actionable half of it.
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
