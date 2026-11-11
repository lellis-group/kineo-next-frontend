import { distinctPoints } from "./camera-target";
import type { MapPlace } from "./types";

/**
 * The words a map popup prints, apart from the DOM that prints them.
 *
 * Pure, so the plural rules and the « how many practices » question are tested
 * without a map: `popup-card.ts` needs a live MapLibre object for its camera
 * button, and that is no reason for its copy to go untested.
 */

/** « 1 annonce », « 3 annonces ». */
export function listingCount(count: number): string {
  return count === 1 ? "1 annonce" : `${count} annonces`;
}

/** How many separate addresses the place's previews stand at. */
export function practiceCount(place: MapPlace): number {
  return distinctPoints(place).length;
}

/**
 * What a group card is titled, and the line under it.
 *
 * One practice is the subject: its name is the heading and its city the line
 * under it. A cluster that merged several practices is titled by their number —
 * naming the first one would tell the reader every posting below is there,
 * which is exactly what a cluster is not — and keeps the city only when they
 * all share it.
 */
export function groupHeading(place: MapPlace): {
  heading: string;
  location: string | null;
} {
  const [first] = place.listings;
  const practices = practiceCount(place);
  if (practices <= 1 && first) {
    return { heading: first.practiceName, location: first.city };
  }
  const cities = new Set(place.listings.map((listing) => listing.city));
  const [onlyCity] = cities;
  return {
    heading: `${practices} cabinets à proximité`,
    location: cities.size === 1 && onlyCity ? onlyCity : null,
  };
}

/**
 * The camera button's label, named for what the move will actually show.
 *
 * Counted in practices, not postings: six openings at one address are one
 * point, and zooming never separates them — so a group at one practice is
 * « centred on », and only a group spread over several points is « zoomed into ».
 */
export function zoomLabel(place: MapPlace): string {
  if (place.count === 1) return "Centrer";
  const practices = practiceCount(place);
  return practices > 1
    ? `Zoomer sur ces ${practices} cabinets`
    : "Centrer sur ce cabinet";
}

/**
 * Postings the place counts but the read sent no preview for.
 *
 * The previews are capped server-side, so a busy practice can hold more than the
 * card can list. Named rather than hidden, so the end of the list is not taken
 * for the end of what sits here.
 */
export function unlistedLine(place: MapPlace): string | null {
  const unlisted = place.count - place.listings.length;
  if (unlisted <= 0) return null;
  return unlisted === 1
    ? "+ 1 autre annonce, visible dans la liste"
    : `+ ${unlisted} autres annonces, visibles dans la liste`;
}

/** The short reference a lone posting leads with — `#A1B2C3D4`. */
export function shortReference(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
