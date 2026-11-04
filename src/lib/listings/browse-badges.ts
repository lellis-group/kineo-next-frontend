/**
 * How a browse posting is badged.
 *
 * The table and the mobile card both decide between « Urgent » and « Ouverte »,
 * and they used to do it by writing the label and the tone out twice — which is
 * how a card ends up reading « Urgent » in red on phones and « Urgent » in
 * something else on a desktop. One decision, two renderings.
 */

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
