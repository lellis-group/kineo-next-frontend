import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import { cameraTargetFor } from "./camera-target";
import type { MapPlace, MapPoint } from "./types";

/**
 * Every camera move the browse map makes. The arithmetic is `cameraTargetFor`;
 * this module turns a target into a `flyTo` or a `fitBounds`.
 */

/** Street level, below OSM's z19 ceiling where tiles go soft. */
const PLACE_ZOOM = 16;

const FLY_DURATION = 600;

/**
 * Takes the camera to one place. A cluster is framed rather than centred:
 * flying to its mean would just reproduce the cluster.
 */
export function zoomToPlace(map: MapLibreMap, place: MapPlace) {
  const target = cameraTargetFor(place);

  if (target.kind === "point") {
    map.flyTo({
      center: target.center,
      zoom: PLACE_ZOOM,
      duration: FLY_DURATION,
    });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const [longitude, latitude] of target.points) {
    bounds.extend([longitude, latitude]);
  }
  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: PLACE_ZOOM,
    duration: FLY_DURATION,
  });
}

/**
 * Frames every place given. A single place gets a fixed zoom, since
 * `fitBounds` on one point leaves the zoom undefined.
 */
export function fitToPlaces(map: MapLibreMap, places: readonly MapPoint[]) {
  // Deduplicated: coinciding corners make a zero-area bounds MapLibre won't fit.
  const seen = new Set<string>();
  const points: MapPoint[] = [];
  for (const place of places) {
    const key = `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(place);
  }

  const [first] = points;
  if (first === undefined) {
    return;
  }
  if (points.length === 1) {
    map.flyTo({ center: [first.longitude, first.latitude], zoom: 12 });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const place of points) {
    bounds.extend([place.longitude, place.latitude]);
  }
  map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 600 });
}

/** The camera to one posting — the same move as the popup's « Centrer ». */
export function flyToPoint(
  map: MapLibreMap,
  point: { latitude: number; longitude: number },
) {
  map.flyTo({
    center: [point.longitude, point.latitude],
    zoom: PLACE_ZOOM,
    duration: FLY_DURATION,
  });
}
