"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { type RefObject, useEffect, useState } from "react";

/** Where the reader is looking, as the clustering depends on it. */
export interface Viewport {
  zoom: number;
  center: [number, number];
}

/**
 * The viewport as last settled, the trigger for re-clustering: zoom and centre
 * (panning can merge pins too). Null until the map has settled once. Updated
 * on `zoomend`/`moveend`, not every frame.
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
