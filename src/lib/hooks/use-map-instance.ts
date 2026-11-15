"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { browserTimeZone, homeRegion } from "@/lib/map/home-region";
import type { MapPoint } from "@/lib/map/types";

/** OSM's standard tile server: no API key. The attribution is required by the ODbL. */
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** French for the strings MapLibre itself renders. Only the IDs this map uses. */
const MAP_LOCALE: Record<string, string> = {
  "Map.Title": "Carte des cabinets",
  "Popup.Close": "Fermer la fiche",
  "NavigationControl.ZoomIn": "Zoom avant",
  "NavigationControl.ZoomOut": "Zoom arrière",
  "AttributionControl.ToggleAttribution": "Afficher l'attribution",
};

/** Literal counterpart of `--map-base` in `globals.css`: keep the two in step. */
const MAP_BASE_COLOR = "#f3f0e8";

/** The deepest zoom OSM serves (z20 answers 400). */
const OSM_MAX_ZOOM = 19;

/**
 * The map instance: created once, torn down once. Knows nothing about markers
 * or popups — see `useMapMarkers`.
 */
export function useMapInstance(homeCoordinates?: MapPoint | null) {
  // Read once, at creation: the camera is the reader's after that.
  const homeRef = useRef(homeCoordinates);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    // The default worker URL does not survive bundling. `setWorkerCount(0)` is
    // not an alternative: MapLibre 6 still dispatches through its actor pool.
    maplibregl.setWorkerUrl(
      new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
    );

    const home = homeRegion({
      coordinates: homeRef.current,
      timeZone: browserTimeZone(),
    });

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStyle(),
        center: home.center,
        zoom: home.zoom,
        attributionControl: false,
        locale: MAP_LOCALE,
      });
    } catch {
      // No WebGL: the list still carries every posting.
      setFailed(true);
      return;
    }

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    map.on("load", () => setReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return { containerRef, mapRef, ready, failed };
}

/**
 * The map's style: OSM tiles at full opacity over a light sheet, slightly
 * desaturated so the markers stay the strongest marks.
 */
function buildStyle() {
  return {
    version: 8 as const,
    sources: {
      osm: {
        type: "raster" as const,
        tiles: [OSM_TILE_URL],
        tileSize: 256,
        // Without it MapLibre requests up to z22 and every tile past 19 fails;
        // with it, MapLibre overzooms instead.
        maxzoom: OSM_MAX_ZOOM,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": MAP_BASE_COLOR },
      },
      {
        id: "osm",
        type: "raster" as const,
        source: "osm",
        paint: {
          "raster-opacity": 1,
          "raster-saturation": -0.35,
          "raster-contrast": -0.05,
        },
      },
    ],
  };
}
