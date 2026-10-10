"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

/**
 * OpenStreetMap's standard tile server.
 *
 * No API key and no account, which is why this is a hard-coded URL rather than
 * an environment variable: the tile request is made from the browser, so a
 * `NEXT_PUBLIC_*` value would end up in the bundle either way. The usage policy
 * asks for a valid `User-Agent` and for no bulk downloading — both are the
 * default posture of an interactive map, and the attribution below is required
 * by the ODbL and is not optional decoration.
 */
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** Where the map opens when nothing on it carries coordinates. */
const FALLBACK_CENTER: [number, number] = [46.603354, 2.373722];

/**
 * The map instance itself: created once, torn down once.
 *
 * Separate from the markers that go on it, because those change with the data
 * while this never does. Having both in one hook made "the map stopped working"
 * and "the pins are stale" the same function to read, and the reason it grew to
 * the point where a change to either meant re-reading both.
 *
 * Knows nothing about markers or popups. It binds no key handler either: the
 * popup is not its state, and a hook that reached into another hook's to dismiss
 * it would make the two order-dependent — neither could be read, or tested,
 * without knowing the other exists.
 */
export function useMapInstance() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    // MapLibre ships its worker as a separate module and resolves it relative to
    // itself by default, which does not survive bundling: the URL comes out wrong
    // and the browser refuses it, leaving a map with no tiles and only a console
    // error to show for it. Pointing it at the bundled copy is what makes them
    // appear.
    //
    // `setWorkerCount(0)` is NOT the shortcut it looks like. MapLibre 6 still
    // dispatches through its actor pool whatever this map draws, so zero workers
    // leaves the dispatcher with nothing to send to and every request ends in
    // "No actors found".
    maplibregl.setWorkerUrl(
      new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
    );

    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStyle(),
        center: FALLBACK_CENTER,
        zoom: 5.2,
        attributionControl: false,
      });
    } catch {
      // No WebGL, or the browser refused the context. The list still carries
      // every posting, so the screen stays usable without the map.
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
 * The map's style document.
 *
 * A dark base under the tiles. The product is a dark surface and OSM raster
 * tiles are light, so without it the map is the one white rectangle on the page;
 * dropping the raster's opacity lets the base come through and pulls the whole
 * map back into the palette.
 */
function buildStyle() {
  return {
    version: 8 as const,
    sources: {
      osm: {
        type: "raster" as const,
        tiles: [OSM_TILE_URL],
        tileSize: 256,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": "#11100f" },
      },
      {
        id: "osm",
        type: "raster" as const,
        source: "osm",
        paint: { "raster-opacity": 0.86 },
      },
    ],
  };
}
