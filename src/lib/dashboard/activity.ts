import type { ApplicationEntry } from "@/lib/applications";
import { formatRelativeTime } from "../format";
import type { ActivityEntry } from "./contracts";

/**
 * How many entries the feed shows.
 *
 * Also the page size the dashboard asks for: the server orders newest first, so
 * the first page of four *is* the four newest — reading twenty pages to keep four
 * rows is the whole thing this screen stopped doing.
 */
export const ACTIVITY_FEED_SIZE = 4;

/**
 * The activity feed: the member's own applications, most recent first.
 *
 * Titles come from the listing each application embeds, so nothing here needs the
 * member's listings at all. It used to build a title map out of every listing the
 * practice owns and fall back to « Titre d'annonce indisponible » for any
 * application whose posting was not in it — which, on a bounded read, is most of
 * the older ones.
 */
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
      // Deep-link straight to the application's dedicated detail page.
      href: `/applications/${app.id}`,
    };
  });
}
