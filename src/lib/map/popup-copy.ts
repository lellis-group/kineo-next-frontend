import { distinctPoints } from "./camera-target";
import type { MapPlace } from "./types";

/** The words a map popup prints, kept pure so they're testable without a map. */

/** « 1 annonce », « 3 annonces ». */
export function listingCount(count: number): string {
  return count === 1 ? "1 annonce" : `${count} annonces`;
}

export function practiceCount(place: MapPlace): number {
  return distinctPoints(place).length;
}

/**
 * A group card's title and the line under it: one practice is named; a cluster
 * of several is counted, with a city only if they all share it.
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
 * The camera button's label, counted in practices: postings at one address
 * never separate, so that's « centrer », not « zoomer ».
 */
export function zoomLabel(place: MapPlace): string {
  if (place.count === 1) return "Centrer";
  const practices = practiceCount(place);
  return practices > 1
    ? `Zoomer sur ces ${practices} cabinets`
    : "Centrer sur ce cabinet";
}

/** Postings beyond the server-capped previews, named so the list isn't taken as complete. */
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
