import type { ApplicationEntry } from "@/lib/applications";
import { formatRelativeTime } from "../format";
import type { ActivityEntry } from "./contracts";

/** Entries in the feed — also the page size asked for (newest first). */
export const ACTIVITY_FEED_SIZE = 4;

/** The activity feed: the member's own applications, titled from their embedded listing. */
export function adaptActivity(
  applications: readonly ApplicationEntry[],
): ActivityEntry[] {
  return applications.slice(0, ACTIVITY_FEED_SIZE).map((app) => {
    const listingLabel = app.listing.title;

    let message: ActivityEntry["message"];
    switch (app.status) {
      case "ACCEPTED":
        message = [
          { text: "Votre candidature à " },
          { text: listingLabel, bold: true },
          { text: " a été acceptée" },
        ];
        break;
      case "REJECTED":
        message = [
          { text: "Votre candidature à " },
          { text: listingLabel, bold: true },
          { text: " n'a pas été retenue" },
        ];
        break;
      case "WITHDRAWN":
        message = [
          { text: "Vous avez retiré votre candidature à " },
          { text: listingLabel, bold: true },
        ];
        break;
      default:
        message = [
          { text: "Candidature envoyée pour " },
          { text: listingLabel, bold: true },
        ];
    }

    return {
      id: app.id,
      icon: app.status === "ACCEPTED" ? ("check" as const) : ("file" as const),
      message,
      timestamp: formatRelativeTime(app.createdAt),
      href: `/applications/${app.id}`,
    };
  });
}
