import {
  AWAITING_DECISION_STATUSES,
  countAwaitingDecision,
} from "../applications";
import { formatDateRange, plural } from "../format";
import { countRecruitingListings, RECRUITING_STATUSES } from "../listings";
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

  // The two statuses behind that total, broken out so the reader can tell a
  // request nobody has opened yet from one the practice has already put forward —
  // the same shape as the listings breakdown below: total above, split below.
  //
  // Kept adjacent to `AWAITING_DECISION_STATUSES` on purpose. A status added to
  // that set counts in the headline whether or not it is named here, so this list
  // has to move with it; nothing enforces that today.
  const pendingCount = applications.filter(
    (a) => a.status === "PENDING",
  ).length;
  const shortlistedCount = applications.filter(
    (a) => a.status === "SHORTLISTED",
  ).length;

  const appsBreakdown = [
    // « en attente » is invariable — no plural suffix on either count.
    `${pendingCount} en attente`,
    `${shortlistedCount} présélectionnée${plural(shortlistedCount)}`,
  ].filter((part) => !part.startsWith("0 "));

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

  // Only a listing that is actually recruiting can be the next replacement to
  // cover. The previous test was "not cancelled", which let a DRAFT (never
  // published) or a CLOSED one — the replacement was found — surface here, and
  // `RECRUITING_STATUSES` is the set that means what it says.
  const now = new Date();
  const upcoming = listings
    .filter(
      (l) => new Date(l.startDate) > now && RECRUITING_STATUSES.has(l.status),
    )
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
