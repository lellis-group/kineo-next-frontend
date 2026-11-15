import { formatDateRange } from "../format";
import type { MyListingsData } from "../listings";
import type { NextReplacement } from "./contracts";

/**
 * The home's one headline: the soonest recruiting posting still to come, as
 * the server picked it — the other figures live in the rail.
 */
export function adaptNextReplacement(
  listings: Pick<MyListingsData, "nextRecruitingListing">,
): NextReplacement {
  const upcoming = listings.nextRecruitingListing;

  if (!upcoming) {
    return {
      period: null,
      label: "Aucune période à couvrir pour l'instant.",
    };
  }

  return {
    period: formatDateRange(upcoming.startDate, upcoming.endDate),
    label: "Période à couvrir par un remplaçant",
    title: upcoming.title,
    href: `/listings/mine/${upcoming.id}`,
  };
}
