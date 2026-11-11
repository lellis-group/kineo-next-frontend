"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { type RefObject, useEffect, useState } from "react";

/** Where the reader is looking, as the clustering depends on it. */
export interface Viewport {
  zoom: number;
  center: [number, number];
}

/**
 * The viewport as last seen, and the trigger for re-clustering.
 *
 * Which markers touch depends on the zoom *and* on where the map is scrolled —
 * panning two pins together merges them just as surely as zooming in does — so
 * the state carries the centre as well as the level. Null until the map has
 * settled once, which is also the signal that clustering can run at all.
 *
 * `zoomend`/`moveend` rather than `zoom` and `move`: the grouping only matters
 * once the reader lets go, and re-projecting on every frame of a pinch is work
 * spent on an answer nobody looks at until the gesture ends.
 */
export function useMapViewport(
  mapRef: RefObject<MapLibreMap | null>,
  ready: boolean,
): Viewport | null {
  const [viewport, setViewport] = useState<Viewport | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) {
      return;
    }
    const onSettled = () => setViewport(viewportOf(map));
    map.on("zoomend", onSettled);
    map.on("moveend", onSettled);
    onSettled();
    return () => {
      map.off("zoomend", onSettled);
      map.off("moveend", onSettled);
    };
  }, [mapRef, ready]);

  return viewport;
}

/** The viewport, read at the moment a gesture settles. */
function viewportOf(map: MapLibreMap): Viewport {
  const centre = map.getCenter();
  return { zoom: map.getZoom(), center: [centre.lng, centre.lat] };
}
