import { byNewestFirst, LISTING_FALLBACK_TITLE } from "@/lib/applications";
import { formatRelativeTime } from "../format";
import type { ApiApplication, ApiReplacementListing } from "../types/api";
import type { ActivityEntry } from "./contracts";

export function adaptActivity(
  applications: ApiApplication[],
  listings: ApiReplacementListing[],
): ActivityEntry[] {
  const listingTitles = new Map(listings.map((l) => [l.id, l.title]));

  // The feed reflects ONLY applications sent by the user — first-person messages.
  // Copied before sorting: `applications` is the collection the other adapters
  // read, and sorting it in place would reorder their input as a side effect.
  return [...applications]
    .sort(byNewestFirst)
    .slice(0, 4)
    .map((app) => {
      const listingLabel =
        listingTitles.get(app.listingId) || LISTING_FALLBACK_TITLE;

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
        icon:
          app.status === "ACCEPTED" ? ("check" as const) : ("file" as const),
        message,
        timestamp: formatRelativeTime(app.createdAt),
        // Deep-link straight to the application's dedicated detail page.
        href: `/applications/${app.id}`,
      };
    });
}
