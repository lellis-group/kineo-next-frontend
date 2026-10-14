import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapPlace } from "@/lib/listings";

/**
 * Which places the map draws as one marker.
 *
 * Pure geometry plus one call into MapLibre — `map.project`, to turn degrees into
 * the pixels the decision is actually made in — so the grouping itself is split
 * out below and testable without a map.
 */

/**
 * How close two markers have to be, in pixels, to count as one.
 *
 * A marker is around 28px across, so 44 leaves them touching but still told
 * apart: close enough that a reader would call them one blob, far enough that
 * neither looks as though it swallowed the other.
 */
const CLUSTER_RADIUS_PX = 44;

/** A place and where it currently stands on screen. */
export interface ProjectedPlace {
  place: MapPlace;
  /**
   * A point in screen pixels.
   *
   * `dist` is declared as a *method* so its parameter is checked bivariantly.
   * MapLibre's own `Point.dist(p: Point)` is narrower than any structural type we
   * could write here, and under strict contravariance a real `Point` would be
   * rejected while a test double built from two plain numbers would be accepted.
   * As a method, both fit — so the grouping can be exercised without a WebGL
   * context, and the distance it measures in production is still MapLibre's
   * rather than a hand-rolled copy of it.
   */
  point: { x: number; y: number; dist(other: ScreenPoint): number };
}

/** The screen position half of `ProjectedPlace`, named for its own sake. */
interface ScreenPoint {
  x: number;
  y: number;
  dist(other: ScreenPoint): number;
}

/**
 * Merges the places that sit on top of each other *on screen*, right now.
 *
 * `/places` already grouped by practice, and exactly — by `practiceId`, not by
 * rounded coordinates. But that is a fact about the practices and says nothing
 * about the current zoom: two cabinets 2.5km apart are one marker's distance
 * apart at country scale and two markers apart once the reader is over the city.
 * Measured at the zoom this map opens on, a pair was stacked on the same pixel —
 * the upper one took every click and the lower one could not be opened at all.
 *
 * The test is therefore a distance in *pixels*, recomputed whenever the viewport
 * settles. Zoom out and the pair merges again behind a count; zoom in over
 * Bordeaux and they separate. No dependency: a greedy pass over a handful of
 * places, whose only input is the reader's current zoom.
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
 * The greedy pass, over places already projected.
 *
 * Separated from `clusterPlaces` because that is the only part of the decision
 * that does not need a live map: given a set of screen positions and a radius,
 * it is a short loop, and the loop is where a grouping bug would live. Exported
 * so it can be exercised directly rather than through a WebGL context.
 *
 * Each unmerged place opens a cluster and absorbs every later place within the
 * radius; a place already absorbed is never reconsidered, which is what makes the
 * result depend only on the input and not on the order it was reached in.
 */
export function groupByDistance(
  points: readonly ProjectedPlace[],
  radius: number,
): MapPlace[] {
  const merged = new Array(points.length).fill(false);
  const clusters: MapPlace[] = [];

  for (let i = 0; i < points.length; i++) {
    if (merged[i]) continue;

    const members = [points[i].place];
    merged[i] = true;

    for (let j = i + 1; j < points.length; j++) {
      if (merged[j]) continue;
      if (points[i].point.dist(points[j].point) < radius) {
        members.push(points[j].place);
        merged[j] = true;
      }
    }

    clusters.push(members.length === 1 ? members[0] : mergePlaces(members));
  }

  return clusters;
}

/** One marker standing for several places: at their centre, holding all of them. */
export function mergePlaces(members: MapPlace[]): MapPlace {
  const total = members.length;

  return {
    // The sum of what the members hold, never `flatMap(listings).length`: the
    // count of postings at a merged place is not the number of previews.
    count: members.reduce((sum, place) => sum + place.count, 0),
    // Sorted, so the key does not depend on the order the places happened to
    // arrive in: an unstable key rebuilds every marker for nothing.
    key: members
      .map((place) => place.key)
      .sort()
      .join("+"),
    latitude: members.reduce((sum, place) => sum + place.latitude, 0) / total,
    longitude: members.reduce((sum, place) => sum + place.longitude, 0) / total,
    listings: members.flatMap((place) => place.listings),
  };
}
