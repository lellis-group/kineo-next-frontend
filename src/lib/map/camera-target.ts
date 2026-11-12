import type { MapPlace } from "./types";

/**
 * Where the camera should go to show one place — a target rather than a
 * camera call, so it can be tested without `maplibre-gl` (which reads `window`
 * on import).
 */
export type CameraTarget =
  | { kind: "point"; center: [number, number] }
  | { kind: "bounds"; points: Array<[number, number]> };

/**
 * The distinct coordinates in a place: duplicates would make a zero-area bounds
 * MapLibre refuses to zoom into.
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
 * Several practices are framed so the dots separate; a single one is a point
 * (`fitBounds` on one coordinate doesn't move the camera). Longitude first.
 */
export function cameraTargetFor(place: MapPlace): CameraTarget {
  const points = distinctPoints(place);

  if (points.length < 2) {
    return { kind: "point", center: [place.longitude, place.latitude] };
  }

  return { kind: "bounds", points };
}

/**
 * The places a framing stands for, as a sorted key, so a re-render of the same
 * collection doesn't refit the camera.
 */
export function framingKey(places: readonly MapPlace[]): string {
  return places
    .map(
      (place) =>
        `${place.key}:${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`,
    )
    .sort()
    .join("|");
}
