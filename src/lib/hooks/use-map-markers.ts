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
import type { MapPlace, MapPlaceListing } from "@/lib/listings";
import { fitToPlaces, flyToPoint } from "@/lib/map/camera";
import { clusterPlaces } from "@/lib/map/clustering";
import { paintStates, rebuildMarkers } from "@/lib/map/markers";
import { openCardForSelected } from "@/lib/map/popup";
import type { MapPoint } from "@/lib/map/types";

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
  framePlaces: (places: readonly MapPoint[]) => void;
}

/**
 * The markers on the map, and the popup one of them opens.
 *
 * Everything here changes with the data; the map instance it draws on does not
 * — that split is the reason two hooks exist, so reading « the pins are wrong »
 * never means reading how the WebGL context was made. This file is the
 * orchestration only: which markers exist, how they group, what a dot draws and
 * what a marker opens are four modules under `lib/map/`.
 *
 * The card is opened from here as well as from a pin: a posting chosen in the
 * table comes with its own card on the map, the only way the two halves read as
 * one screen.
 *
 * Two states, never the same value, and the difference is the screen's whole
 * interactivity: `hoveredListingId` is what the reader is *pointing at* — a
 * preview that lives as long as the pointer — while `selectedListing` is what
 * they *chose*, and it outlives the pointer.
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
  onListingOpen,
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
   * The whole preview travels, coordinates included: the marker that has to be
   * marked is the one standing *at* that point, and the row may live on another
   * page — so the screen needs the title and the place as well as the id.
   */
  onMarkerSelect?: (listing: MapPlaceListing) => void;
  /**
   * A posting chosen in a popup: the reader wants its row, not its marker.
   *
   * Kept apart from the hover callback because they must not be the same thing.
   * One drives a highlight the other drives a scroll, and merging them would make
   * the mouse moving across the table scroll the page under the reader.
   */
  onListingPick?: (listing: MapPlaceListing) => void;
  /**
   * The posting's own page — the bridge to the router.
   *
   * The popup's card links to `/listings/{id}` (see `listingLink` in
   * `popup.ts`), and a plain anchor would reload the whole document: this is
   * the same screen's soft navigation, handed down from where the router
   * lives.
   */
  onListingOpen?: (listing: MapPlaceListing) => void;
}) {
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  /**
   * Dots mid-exit: MapLibre has let go of them, we have not.
   *
   * Not owned by any MapLibre object, so nothing else will ever remove them;
   * the teardown below does.
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

  const onOpenRef = useRef(onListingOpen);
  onOpenRef.current = onListingOpen;

  /** The framing key the camera was last fitted over, so a refit is not repeated. */
  const lastFramedKeyRef = useRef<string | null>(null);

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
    if (!map || !ready) {
      return;
    }

    // A pan settles often without changing which markers touch, and rebuilding
    // them is what costs: positions are MapLibre's job and it repositions existing
    // markers on every frame. The signature is what says the *set* changed — and
    // an empty set has a signature of its own (""), so filtering down to nothing
    // reaches the rebuild that clears the map of the pins the previous view drew.
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
          onOpen: onOpenRef,
        },
      );
    }

    /**
     * Fitted over the places when their *content* changes, and nothing else.
     *
     * Every server navigation hands this effect a fresh array — the places read
     * arrives as a promise and is unwrapped per navigation — so an identity
     * gate (`places !== lastFramed`) never saw the second render of the same
     * collection and the camera was refitted, dragging the reader's own pan
     * and zoom away with it, on every page turn and every reordering. The key
     * is the content itself: identical practices at identical points read as
     * the same frame.
     */
    const framedKey = framingKey(places);
    if (framedKey !== lastFramedKeyRef.current) {
      lastFramedKeyRef.current = framedKey;
      fitToPlaces(map, places);
    }

    // Applied here too, so markers created after a selection was already made
    // come up highlighted rather than waiting for the next hover.
    paintStates(markersRef.current, hoveredIdRef.current, selectedRef.current);

    // And the chosen posting's card: it opens the moment a marker stands at its
    // own coordinates, which is not the moment the row was clicked — the camera
    // is still flying, and the marker that covered the posting a frame ago may
    // have been a merged cluster. Waiting for the coordinates rather than a
    // timer is what makes this both correct and stateless.
    openCardForSelected(
      markersRef.current,
      livePlacesRef.current,
      popupRef,
      map,
      selectedRef.current,
      onPickRef.current,
      onOpenRef.current,
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
    // A dropped choice closes its own card: the popup belongs to the choice —
    // opened by a marker click or a pick in the list — and a card the choice no
    // longer stands for is a card about nothing. Markers are de-highlighted by
    // `paintStates` above; the popup has to go the same way.
    if (!selectedListing) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }
    openCardForSelected(
      markersRef.current,
      livePlacesRef.current,
      popupRef,
      map,
      selectedListing,
      onPickRef.current,
      onOpenRef.current,
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
   * It clears the *selection* too, not just the card: the card belongs to the
   * choice, and a popup closed while the row stayed lit would be a ring with
   * nothing on the map to explain it. The click on the map's background does
   * the same — a second click on the marker re-opens, since markers stop their
   * propagation.
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
     * click on one of its entries bubbles here: without it, an entry's click
     * would set a choice and this would clear it in the same event — the popup
     * would be the one door that could not make a selection.
     */
    const onMapClick = (event: maplibregl.MapMouseEvent) => {
      const target = event.originalEvent?.target as HTMLElement | null;
      if (target?.closest(".maplibregl-popup")) return;
      dismiss();
    };

    /**
     * Escape clears a choice the *map* made — not whichever control the reader
     * happens to be in.
     *
     * The toolbar's « Filtres » popover and its two search fields each bind
     * their own Escape to close themselves, and this listener is on the
     * document like theirs: ungated, closing the popover also reached over and
     * dropped the selection on the map. The map owns the key when focus is
     * nowhere (the body a click on the canvas or a marker left) or inside the
     * map container — which is where the markers and the popup live.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target && target !== document.body) {
        if (!map.getContainer().contains(target)) return;
      }
      dismiss();
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
    (frame: readonly MapPoint[]) => {
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

/**
 * The collection a camera framing stands for, as a comparable key.
 *
 * Key and coordinates, sorted: the order the read answered in says nothing
 * about geography (`/places` ranks practices by activity), and the coordinates
 * belong in the key because a practice regrouped at a new point deserves the
 * new frame. Two places on the same practice key are two entries here — the
 * merge that `clusterPlaces` does later is a matter of zoom, not of identity.
 */
function framingKey(places: readonly MapPlace[]): string {
  return places
    .map(
      (place) =>
        `${place.key}:${place.latitude.toFixed(5)},${place.longitude.toFixed(
          5,
        )}`,
    )
    .sort()
    .join("|");
}
