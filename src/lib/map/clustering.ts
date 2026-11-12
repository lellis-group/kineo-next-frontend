import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapPlace } from "./types";

/** How close two markers have to be, in pixels, to merge. */
const CLUSTER_RADIUS_PX = 44;

export interface ProjectedPlace {
  place: MapPlace;
  /**
   * `dist` is a method so its parameter is checked bivariantly: both MapLibre's
   * `Point` and a plain test double fit.
   */
  point: { x: number; y: number; dist(other: ScreenPoint): number };
}

interface ScreenPoint {
  x: number;
  y: number;
  dist(other: ScreenPoint): number;
}

/**
 * Merges the places that overlap *on screen* at the current zoom. `/places`
 * groups by practice, but two practices can still stack on one pixel when
 * zoomed out.
 */
export function clusterPlaces(
  map: MapLibreMap,
  places: readonly MapPlace[],
): MapPlace[] {
  if (places.length < 2) {
    return [...places];
  }

  return groupByDistance(
    places.map((place) => ({
      place,
      point: map.project([place.longitude, place.latitude]),
    })),
    CLUSTER_RADIUS_PX,
  );
}

/**
 * The greedy pass over projected places, exported to test without a map. Each
 * unmerged place absorbs every later one within the radius.
 */
export function groupByDistance(
  points: readonly ProjectedPlace[],
  radius: number,
): MapPlace[] {
  const merged = new Array(points.length).fill(false);
  const clusters: MapPlace[] = [];

  for (let i = 0; i < points.length; i++) {
    const head = points[i];
    if (head === undefined || merged[i]) continue;

    const members = [head.place];
    merged[i] = true;

    for (let j = i + 1; j < points.length; j++) {
      const candidate = points[j];
      if (candidate === undefined || merged[j]) continue;
      if (head.point.dist(candidate.point) < radius) {
        members.push(candidate.place);
        merged[j] = true;
      }
    }

    const [only] = members;
    clusters.push(
      members.length === 1 && only !== undefined ? only : mergePlaces(members),
    );
  }

  return clusters;
}

export function mergePlaces(members: MapPlace[]): MapPlace {
  const total = members.length;

  return {
    // Not the number of previews: a place may hold more postings than previews.
    count: members.reduce((sum, place) => sum + place.count, 0),
    // Sorted, so the key is stable and markers aren't rebuilt for nothing.
    key: members
      .map((place) => place.key)
      .sort()
      .join("+"),
    latitude: members.reduce((sum, place) => sum + place.latitude, 0) / total,
    longitude: members.reduce((sum, place) => sum + place.longitude, 0) / total,
    listings: members.flatMap((place) => place.listings),
  };
}
