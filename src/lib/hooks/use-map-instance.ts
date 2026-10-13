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

/**
 * The paper the map is drawn on, before any tile arrives.
 *
 * The literal counterpart of `--map-base` in `globals.css`, which the loading
 * and failure states use for the same purpose. It is written out rather than
 * read from the computed style because MapLibre wants a colour value it can hand
 * to its own renderer, and the one place this is not a duplicate is the theme —
 * where a change to the token has to change this too.
 */
const MAP_BASE_COLOR = "#e9e5d9";

/**
 * The deepest zoom OSM actually serves.
 *
 * Measured against the live server rather than taken from the docs: z19 answers
 * 200, z20 answers 400. The two facts the map depends on are that the server
 * stops here and that MapLibre would otherwise carry on to 22.
 */
const OSM_MAX_ZOOM = 19;

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
 * Knows nothing about markers, popups or the viewport: it owns the canvas and the
 * context, and the layers above subscribe to the map themselves. Passing a
 * viewport callback in here instead would make the two order-dependent — neither
 * readable, nor testable, without knowing the other exists.
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
 * A light sheet under the tiles, and the tiles at full strength.
 *
 * The product's chrome is dark and the reference map is not — it is a pale warm
 * plan of the streets, and it is the one bright plane on that screen. The tiles
 * were previously pulled down to 86% over a near-black background to fit the
 * dark palette; that was the map being made to match its surroundings rather
 * than the other way round, and it cost the reader the only thing a map is for.
 *
 * `raster-opacity: 1` follows from it. The 86% was a blend towards the dark
 * base showing through; over a light base there is nothing to blend with, and
 * anything less than full leaves the map a shade of mud.
 *
 * `raster-saturation` and `raster-contrast` take a little of the colour out of
 * OSM's cartography. A raster style with no tuning is drawn for a white page:
 * greens and reds that are legible on paper become the loudest thing on a dark
 * screen, and the markers — which carry the data — stop being the darkest marks
 * on it. Pulled back, the streets read as a base layer.
 */
function buildStyle() {
  return {
    version: 8 as const,
    sources: {
      osm: {
        type: "raster" as const,
        tiles: [OSM_TILE_URL],
        tileSize: 256,
        // OSM publishes z0-19 and answers z20+ with a 400. MapLibre's default
        // for a raster source is z22, so without this the map asks for tiles that
        // cannot exist and every one of them lands in the console as an
        // `AJAXError: Failed to fetch`. Declaring the real ceiling makes
        // MapLibre overzoom instead — it scales the deepest tile it does have up
        // to the requested level, which is blurry past 19 and honest everywhere
        // below it.
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
