import type { MapPlace } from "./browse-contracts";

/**
 * Where the camera should go when the reader asks to look at one place.
 *
 * A target rather than a camera call, so the arithmetic can be tested without a
 * WebGL context — `maplibre-gl` reads `window` on import and cannot be loaded in
 * a test process at all. The hook turns one of these into a `flyTo` or a
 * `fitBounds`.
 */
export type CameraTarget =
  | { kind: "point"; center: [number, number] }
  | { kind: "bounds"; points: Array<[number, number]> };

/**
 * The coordinates a place actually sits on, one per practice.
 *
 * Deduplicated, and this is the whole reason the module exists: the postings in
 * a place carry coordinates individually, so a practice with six openings would
 * contribute six identical points and the bounds below would be a zero-area
 * rectangle — which MapLibre answers by refusing to zoom at all.
 */
export function distinctPoints(place: MapPlace): Array<[number, number]> {
  const seen = new Set<string>();
  const points: Array<[number, number]> = [];

  for (const listing of place.listings) {
    const { latitude, longitude } = listing.location;
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push([longitude, latitude]);
  }

  return points;
}

/**
 * The camera target for one place.
 *
 * A place covering several practices frames the practices it covers, so the dots
 * separate instead of merging straight back into the one the reader just opened.
 * A place covering one is a point: `fitBounds` on a single coordinate is the
 * documented way to end up with a camera that never moves.
 *
 * Ordered longitude-first, because that is the order every GeoJSON and
 * MapLibre call in this codebase has used since the map was written.
 */
export function cameraTargetFor(place: MapPlace): CameraTarget {
  const points = distinctPoints(place);

  if (points.length < 2) {
    // The place's own coordinate rather than the first member's: for a lone
    // practice they are the same value, and it is the one that exists even if a
    // place ever arrives with no listings to frame.
    return { kind: "point", center: [place.longitude, place.latitude] };
  }

  return { kind: "bounds", points };
}
