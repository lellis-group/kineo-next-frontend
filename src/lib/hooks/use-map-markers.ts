"use client";

import type * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MapPlace } from "@/lib/listings";
import { fitToPlaces, flyToPoint } from "@/lib/map/camera";
import { clusterPlaces } from "@/lib/map/clustering";
import { paintStates, rebuildMarkers } from "@/lib/map/markers";
import { openCardForSelected } from "@/lib/map/popup";

/**
 * Everything the screen can ask of the map from outside it.
 *
 * The same shape of contract as `ListingsTableHandle`, and for the same reason:
 * the browse screen's two halves are one set of rows seen two ways, so each half
 * exposes the handful of things the other needs done to it. The table is asked to
 * scroll to a row; the map is asked to fly to a point, to frame a set of places,
 * and (through `selectedListing`) to hold a posting open.
 */
export interface ListingsMapHandle {
  /** Flies the camera to one posting's coordinates, street level. */
  focusOn: (point: { latitude: number; longitude: number }) => void;
  /** Frames every place given — a page of results, typically. */
  framePlaces: (places: readonly MapPlace[]) => void;
}

/**
 * The markers on the map, and the popup one of them opens.
 *
 * Everything here changes with the data; the map instance it draws on does not.
 * That split is the reason this is not the same hook as the instance's: reading
 * "the pins are wrong" should not mean reading how the WebGL context was made.
 *
 * This file is the orchestration and nothing else. The four things it arranges —
 * which markers exist, how they are grouped, what is drawn inside one, and what
 * card a marker opens — are four modules under `lib/map/`, each of which can be
 * read without reading the other three. What is left is the part none of them
 * could own: the refs the effects share, the listeners the reader installs, and
 * the handle the screen holds.
 *
 * The popup is opened from here as well as from a marker because a posting chosen
 * in the table comes with its own card on the map — the reference's arrangement,
 * and the only way the two halves ever read as one screen. Opening is therefore a
 * function the hook calls rather than a branch inside one listener.
 *
 * Two states, not one, and the difference is the whole point of the screen's
 * interactivity: `hoveredListingId` is what the reader is *pointing at*, an
 * ephemeral preview; `selectedListing` is what the reader has *chosen*, and it
 * survives the pointer leaving. They must never be the same value — merging
 * them is what this screen did, and it meant a selection lasted exactly as long
 * as the mouse stayed on the row.
 */
export function useMapMarkers({
  mapRef,
  places,
  ready,
  hoveredListingId,
  onHoveredChange,
  selectedListing,
  onSelectionClear,
  onMarkerSelect,
  onListingPick,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  places: MapPlace[];
  /** The map reports its style loaded; nothing is added before then. */
  ready: boolean;
  /** Row the reader is pointing at — the preview state. */
  hoveredListingId?: string | null;
  onHoveredChange?: (id: string | null) => void;
  /**
   * The posting the reader has chosen, with its coordinates.
   *
   * The coordinates travel with it rather than being looked up: the marker to
   * open is only the right one once it stands *at that point*, which is how a
   * merged cluster is told apart from the practice it was merged from. A record
   * of the two means the popup waits for the camera rather than opening at
   * wherever the pin happened to be.
   */
  selectedListing?: {
    id: string;
    latitude: number;
    longitude: number;
  } | null;
  /** Called when the reader dismisses the selection (Escape, or the map itself). */
  onSelectionClear?: () => void;
  /**
   * Called when a marker is chosen — a click on a pin, the mirror of the table's
   * title button.
   *
   * The coordinates travel with the id for the same reason they do in
   * `selectedListing`: the marker that has to be marked is the one standing *at*
   * that point. Without it, clicking a pin would only preview — the cream ring
   * would leave with the pointer, and a reader who clicked a marker would have
   * made no choice at all.
   */
  onMarkerSelect?: (point: {
    id: string;
    latitude: number;
    longitude: number;
  }) => void;
  /**
   * A posting chosen in a popup: the reader wants its row, not its marker.
   *
   * Kept apart from the hover callback because they must not be the same thing.
   * One drives a highlight the other drives a scroll, and merging them would make
   * the mouse moving across the table scroll the page under the reader.
   */
  onListingPick?: (id: string) => void;
}) {
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  /**
   * Dots mid-exit: MapLibre has let go of them, we have not.
   *
   * Not owned by any MapLibre object any more, so nothing else will ever remove
   * them. Cleared with the rest in the teardown below.
   */
  const leavingRef = useRef<HTMLElement[]>([]);

  /**
   * The place each marker currently stands for, by key.
   *
   * A marker outlives the data it was built from, so its handlers cannot close
   * over a place — they read this instead. One entry per marker, dropped with
   * the marker it belongs to.
   */
  const livePlacesRef = useRef<Map<string, MapPlace>>(new Map());

  /**
   * Handlers and the current selection are read through refs rather than being
   * effect dependencies. They are only ever called from inside DOM listeners,
   * and listing them would tear down and rebuild every marker on every row
   * hover — which is the one thing this screen does most.
   */
  const onHoverRef = useRef(onHoveredChange);
  onHoverRef.current = onHoveredChange;

  const onPickRef = useRef(onListingPick);
  onPickRef.current = onListingPick;

  const hoveredIdRef = useRef(hoveredListingId);
  hoveredIdRef.current = hoveredListingId;

  const selectedRef = useRef(selectedListing);
  selectedRef.current = selectedListing;

  const onSelectionClearRef = useRef(onSelectionClear);
  onSelectionClearRef.current = onSelectionClear;

  const onMarkerSelectRef = useRef(onMarkerSelect);
  onMarkerSelectRef.current = onMarkerSelect;

  /** The places the camera was last framed on, so a refit is not repeated. */
  const lastFramedRef = useRef<MapPlace[] | null>(null);

  /** The cluster set on the map, so an unchanged one is not rebuilt. */
  const lastSignatureRef = useRef<string | null>(null);

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

  const clusters = useMemo(
    () =>
      viewport && mapRef.current ? clusterPlaces(mapRef.current, places) : [],
    [viewport, places, mapRef],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || clusters.length === 0) {
      return;
    }

    // A pan settles often without changing which markers touch, and rebuilding
    // them is what costs: positions are MapLibre's job and it repositions existing
    // markers on every frame. The signature is what says the *set* changed.
    const signature = clusters
      .map((place) => `${place.key}:${place.count}`)
      .join("|");
    if (signature !== lastSignatureRef.current) {
      lastSignatureRef.current = signature;
      rebuildMarkers(
        map,
        clusters,
        markersRef.current,
        livePlacesRef.current,
        popupRef,
        leavingRef.current,
        {
          onPick: onPickRef,
          onHover: onHoverRef,
          onMarkerSelect: onMarkerSelectRef,
        },
      );
    }

    // Gated on the places themselves, not on the viewport: re-framing the camera
    // every time the reader scrolls would make the map impossible to look at.
    if (places !== lastFramedRef.current) {
      lastFramedRef.current = places;
      fitToPlaces(map, places);
    }

    // Applied here too, so markers created after a selection was already made
    // come up highlighted rather than waiting for the next hover.
    paintStates(markersRef.current, hoveredIdRef.current, selectedRef.current);

    // And the chosen posting's card: it opens the moment a marker stands at its
    // own coordinates, which is not the moment the row was clicked — the camera
    // is still flying, and the marker that covered the posting a frame ago may
    // have been a merged cluster. Waiting for the coordinates rather than for a
    // timer is what makes this both correct and stateless.
    openCardForSelected(
      markersRef.current,
      livePlacesRef.current,
      popupRef,
      map,
      selectedRef.current,
      onPickRef.current,
    );
  }, [mapRef, clusters, places, ready]);

  // The table's hover state has to reach the marker, not just the other way.
  useEffect(() => {
    paintStates(markersRef.current, hoveredListingId, selectedRef.current);
  }, [hoveredListingId]);

  // A choice made in the list: the popup follows it as soon as the map can.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    paintStates(markersRef.current, hoveredIdRef.current, selectedListing);
    openCardForSelected(
      markersRef.current,
      livePlacesRef.current,
      popupRef,
      map,
      selectedListing,
      onPickRef.current,
    );
  }, [mapRef, ready, selectedListing]);

  /**
   * Escape, and the map's own background: the two ways a choice is dropped.
   *
   * MapLibre binds no Escape handler of its own, so a keyboard user could open a
   * popup and have no way to dismiss it. Bound here rather than by the component
   * because the popup is this hook's state: whoever opens a thing closes it. On
   * the document, because focus never moves into the popup — it is not a focus
   * trap and should not become one.
   *
   * It clears the *selection* too, not just the card: the two were one value
   * here, and a popup closed by Escape used to leave the row lit with nothing on
   * the map to explain it. The click on the map's background does the same — a
   * second click on the marker re-opens, since markers stop their propagation.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return undefined;

    const dismiss = () => {
      popupRef.current?.remove();
      popupRef.current = null;
      onSelectionClearRef.current?.();
    };

    /**
     * A click on the map's background — not on the card it is showing.
     *
     * The guard matters because the card lives *inside* the map container, so a
     * click on one of its entries bubbles here: the entry sets a choice and this
     * would clear it in the same event, which is how a popup used to be the one
     * door that could not make a selection.
     */
    const onMapClick = (event: maplibregl.MapMouseEvent) => {
      const target = event.originalEvent?.target as HTMLElement | null;
      if (target?.closest(".maplibregl-popup")) return;
      dismiss();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    map.on("click", onMapClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      map.off("click", onMapClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mapRef, ready]);

  useEffect(
    () => () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      livePlacesRef.current.clear();
      popupRef.current?.remove();
      for (const node of leavingRef.current) node.remove();
      leavingRef.current = [];
    },
    [],
  );

  /**
   * The camera, from outside the hook.
   *
   * `useCallback` over a ref, so the identity is stable and the map component can
   * expose it through an imperative handle without rebuilding that handle on
   * every render. The move itself is the one the popup's own « Centrer » makes,
   * which is why it is `flyToPoint` and not a second copy of the same three
   * lines.
   */
  const focusOn = useCallback(
    (point: { latitude: number; longitude: number }) => {
      const map = mapRef.current;
      if (map) flyToPoint(map, point);
    },
    [mapRef],
  );

  /**
   * Frames the places given — a page of results, typically.
   *
   * Not the same as `focusOn`, and not a zoom to the first of them: a practice
   * turning pages wants to see where *this page's* open postings are, all of them
   * at once, and the collection is larger than the page by construction.
   */
  const framePlaces = useCallback(
    (frame: readonly MapPlace[]) => {
      const map = mapRef.current;
      if (!map) return;
      fitToPlaces(map, frame);
    },
    [mapRef],
  );

  return useMemo(() => ({ focusOn, framePlaces }), [focusOn, framePlaces]);
}

/** Where the reader is looking, as the clustering depends on it. */
interface Viewport {
  zoom: number;
  center: [number, number];
}

/**
 * The viewport, read at the moment a gesture settles.
 *
 * Carries the centre as well as the level because panning two pins together
 * merges them exactly as surely as zooming in does, and a state holding only the
 * zoom would leave a pan silently unreclustered.
 */
function viewportOf(map: MapLibreMap): Viewport {
  const centre = map.getCenter();
  return { zoom: map.getZoom(), center: [centre.lng, centre.lat] };
}
