/** How a browse posting is badged (« Urgent » or « Ouverte »), for the table and the card. */

import type { BadgeTone } from "@/lib/ui-tokens";

/** Tone used on the « Urgent » badge of a listing in the feed. */
const URGENT_TONE = "danger";
const OPEN_TONE = "info";

export function listingBadge(listing: { urgent: boolean }): {
  label: string;
  tone: BadgeTone;
} {
  return listing.urgent
    ? { label: "Urgent", tone: URGENT_TONE }
    : { label: "Ouverte", tone: OPEN_TONE };
}
