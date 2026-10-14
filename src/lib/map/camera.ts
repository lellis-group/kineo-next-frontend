import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import { cameraTargetFor, type MapPlace } from "@/lib/listings";

/**
 * Every camera move the browse map makes, in one place.
 *
 * The arithmetic is not here — that is `cameraTargetFor`, and it is pure and
 * tested. What is here is the part that needs a live MapLibre object: turning a
 * target into a `flyTo` or a `fitBounds`.
 *
 * Split out of `useMapMarkers` rather than left in it because two other modules
 * need it — a marker's double-click and the popup's « Centrer » button. Left in
 * the hook, `markers.ts` and `popup.ts` would have to import the hook that
 * imports them.
 *
 * Server-agnostic but browser-only in practice: it touches no React and no
 * `window`, only the map it is handed.
 */

/**
 * How close the camera comes to a place the reader asked to look at.
 *
 * Street-level without going to the tile limit: OSM only publishes up to z19 and
 * `useMapInstance` caps the source there, so anything past this is MapLibre
 * enlarging a raster tile until it is visibly soft.
 */
const PLACE_ZOOM = 16;

/** Long enough to read as a camera move, short enough not to lose the reader. */
const FLY_DURATION = 600;

/**
 * Takes the camera to one place.
 *
 * The arithmetic lives in `cameraTargetFor`; this is only the camera call.
 *
 * Framing a group rather than centring it is the point of the whole gesture: a
 * cluster's coordinates are the mean of the practices it covers, so flying to
 * that mean reproduces the cluster — the reader zooms and the same dot is still
 * there. Framing its members is what makes them separate, and the re-clustering
 * the zoom triggers is what spreads them back out.
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
 * Frames every place on the map.
 *
 * `fitBounds` rather than a fixed centre: the reader opened the page to see where
 * the work is, and a map centred on Paris because the default view was written
 * there says nothing about a posting in Nantes. Guarded against a single place —
 * `fitBounds` on one point leaves the camera at an undefined zoom.
 *
 * The guard against one place is also why the zoom is written out rather than
 * taken from `PLACE_ZOOM`: a whole page is being framed here, not one posting
 * the reader pointed at, and street level would put four pins inside one block.
 */
export function fitToPlaces(map: MapLibreMap, places: readonly MapPlace[]) {
  if (places.length === 0) {
    return;
  }
  if (places.length === 1) {
    map.flyTo({ center: [places[0].longitude, places[0].latitude], zoom: 12 });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const place of places) {
    bounds.extend([place.longitude, place.latitude]);
  }
  map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 600 });
}

/**
 * The camera to one posting, from outside the map.
 *
 * The shape the hook exposes on its handle, with the constant resolved here: the
 * call is the same one the popup's own « Centrer » makes, so both moves are
 * street level and take the same time.
 */
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
