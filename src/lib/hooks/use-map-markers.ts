"use client";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { cameraTargetFor, type MapPlace } from "@/lib/listings";

/**
 * The marker's box: sized here, positioned by MapLibre, and never animated.
 *
 * No `hover:scale` here, and that is not a style choice. MapLibre centres a
 * marker with a `translate(-50%, -50%)` expressed as a percentage of its own
 * box, so growing the marker on hover moves it — measured at nearly 50px, on a
 * button the reader had merely pointed at. Anything that changes the *box* is off
 * the table; the emphasis is a ring instead.
 *
 * The dot is a child element, and that is what buys the entrance animation: a
 * `scale` on the child leaves this box exactly as MapLibre sized it, so the
 * transform it writes keeps aiming at the same point while the dot grows inside.
 * See `.marker-dot` and `kineo-marker-enter` in `globals.css`.
 */
/**
 * The marker's box: sized here, positioned by MapLibre, and never animated.
 *
 * No `hover:scale` here, and that is not a style choice. MapLibre centres a
 * marker with a `translate(-50%, -50%)` expressed as a percentage of its own
 * box, so growing the marker on hover moves it — measured at nearly 50px, on a
 * marker the reader had merely pointed at. Anything that changes the *box* is
 * off the table; the emphasis is a ring instead.
 *
 * `size-5`, which on the theme's 0.3rem unit is 24px: the reference's discs are
 * a little smaller than this screen used to draw them, and at 28px a map of
 * cabinets starts to look crowded before there are more than a dozen pins.
 *
 * The disc is a child element, and that is what buys the entrance animation: a
 * `scale` on the child leaves this box exactly as MapLibre sized it, so the
 * transform it writes keeps aiming at the same point while the round grows
 * inside. See `.marker-dot` and `kineo-marker-enter` in `globals.css`.
 */
const MARKER_CLASS = "grid size-5 cursor-pointer place-items-center";

/** The mark inside a lone posting's disc — the reference's own. */
const MARKER_DOT_CLASS =
  "marker-dot grid size-full place-items-center rounded-full bg-surface text-foreground";

/** A place with more than one posting: bigger, and it carries the count. */
const MARKER_CLUSTER_CLASS = "!size-6";
const MARKER_DOT_CLUSTER_CLASS = "!text-[0.625rem] !font-bold";

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
 * How far a card is kept from the map's edges, in pixels.
 *
 * Used twice, and that is the point: MapLibre's own anchor choice and the nudge
 * that finishes the job have to agree on the margin or they move the same card
 * in two directions.
 */
const POPUP_EDGE_MARGIN = 12;

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
 * The popup is rendered here rather than in the component because opening one is
 * a consequence of clicking a marker, and a marker is a node this hook owns. It
 * is also opened from the table — a posting picked in the list comes with its own
 * card on the map, the reference's arrangement — so opening is a function this
 * hook exposes rather than a branch inside one listener.
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
   * every render. The camera call itself is the same one the popup's own « Centrer »
   * makes: `PLACE_ZOOM` is street level without going to the tile limit, and the
   * fly duration is the one the reference dashboard would use — long enough to
   * read as a move, short enough not to wait out.
   */
  const focusOn = useCallback(
    (point: { latitude: number; longitude: number }) => {
      mapRef.current?.flyTo({
        center: [point.longitude, point.latitude],
        zoom: PLACE_ZOOM,
        duration: FLY_DURATION,
      });
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
      if (frame.length === 1) {
        map.flyTo({
          center: [frame[0].longitude, frame[0].latitude],
          zoom: 12,
          duration: FLY_DURATION,
        });
        return;
      }
      if (frame.length === 0) return;
      const bounds = new maplibregl.LngLatBounds();
      for (const place of frame) {
        bounds.extend([place.longitude, place.latitude]);
      }
      map.fitBounds(bounds, {
        padding: 64,
        maxZoom: 14,
        duration: FLY_DURATION,
      });
    },
    [mapRef],
  );

  return useMemo(() => ({ focusOn, framePlaces }), [focusOn, framePlaces]);
}

/**
 * Opens the card for one marker, whichever door the reader came through.
 *
 * Extracted out of the marker's click handler because the same thing now happens
 * from the list: a posting chosen in the table comes with its card on the map,
 * which is the reference's arrangement and the only way the two halves ever read
 * as one screen. Two doors, one body — the alternative is a second copy of the
 * popup's construction, and the two would drift the first time a field moved.
 *
 * A lone posting picks itself: it has no list to choose from, so the choice the
 * reader just made is propagated outward so the row can light up (and scroll into
 * view if it is not on the page). A group waits — the reader picks the entry,
 * because « three annonces » is not a choice of any one of them.
 */
function openPopupForKey(
  key: string,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  map: MapLibreMap,
  handlers: {
    onPick?: (id: string) => void;
    onHover?: (id: string | null) => void;
    onMarkerSelect?: (point: {
      id: string;
      latitude: number;
      longitude: number;
    }) => void;
  },
) {
  const live = livePlaces.get(key);
  if (!live) return;

  popupRef.current?.remove();
  popupRef.current = new maplibregl.Popup({
    offset: 16,
    // The very click that opened it used to close it again: the marker
    // sits inside the map, so the click bubbled up and MapLibre dismissed
    // the popup on the same event. `stopPropagation` at the click site is what
    // makes this safe — without it, `true` would mean a popup that never stays
    // open.
    closeOnClick: true,
    closeButton: true,
    /*
      MapLibre picks the card's anchor itself when none is given — above or below
      the marker, and to one side — but it does so against a padding of **zero**:
      it only moves once the card is already at the edge. Handing it the same
      margin `keepPopupInView` works with makes that decision happen a step
      earlier, so the flip and the nudge stop fighting over the same pixel and
      the card lands with air around it from the start.
    */
    padding: {
      top: POPUP_EDGE_MARGIN,
      bottom: POPUP_EDGE_MARGIN,
      left: POPUP_EDGE_MARGIN,
      right: POPUP_EDGE_MARGIN,
    },
  })
    .setLngLat([live.longitude, live.latitude])
    /**
     * The popup dismissing itself is a read of the ref rather than a
     * captured instance: the content is built before the popup exists, and
     * the two are chained in one expression. The closure resolves it on the
     * click, by which time it is set.
     */
    .setDOMContent(
      popupContent(
        live,
        map,
        () => popupRef.current?.remove(),
        (id) => handlers.onPick?.(id),
      ),
    )
    .addTo(map);

  // A card that arrives cropped is a card the reader cannot read, and the map's
  // box is small by design — it shares the screen with the table. MapLibre has no
  // collision detection for popups, so the camera makes room instead.
  keepPopupInView(map, popupRef.current);

  // A lone posting has no list to choose from, so it selects itself: a click on
  // its pin is a choice, and a choice has to outlive the pointer that made it.
  // A group waits — the reader picks the entry.
  if (live.listings.length === 1) {
    const [only] = live.listings;
    handlers.onHover?.(only.id);
    handlers.onMarkerSelect?.({
      id: only.id,
      latitude: only.location.latitude,
      longitude: only.location.longitude,
    });
  }
}

/**
 * Nudges the camera so a card that just opened is entirely inside the map.
 *
 * MapLibre positions a popup from its marker and clips whatever falls outside the
 * container — it has no collision detection of its own. What it *does* have is
 * anchor choice: with no `anchor` given, it flips the card above or below the
 * marker and to one side, which already covers most of the frame's edges (it is
 * why four markers fitted to the bounds of a 384px map all opened inside it).
 *
 * What that cannot do is two things, and both are the nudge's job:
 *
 * - a card near a corner can be anchored correctly and still sit off the frame,
 *   because the anchor is chosen from the marker's half of the map and not from
 *   the card's box;
 * - a card taller than the frame fits nowhere, and there the two mechanisms have
 *   to agree on losing: this one declines, and MapLibre's flip — which at least
 *   compares the room above and below the marker — decides.
 *
 * The nudge is measured, not guessed: the card's box is read after it exists in
 * the DOM, the overflow against the container's edges is the distance to move,
 * and only the axes that actually overflow move. `panBy` rather than `panTo`
 * because the offset is in screen pixels — it is the difference between two
 * rectangles, and translating that into a centre would need a projection the map
 * already does for us.
 *
 * It re-runs harmlessly on the `moveend` it causes: a re-cluster opens nothing
 * new, because the card is already at the place it was opened for.
 */
function keepPopupInView(map: MapLibreMap, popup: maplibregl.Popup | null) {
  if (!popup) return;

  const frame = map.getContainer().getBoundingClientRect();
  const card = popup.getElement().getBoundingClientRect();
  if (frame.width === 0 || frame.height === 0) return;

  // Too big to place: MapLibre's own anchor choice is the better guess, because it
  // knows which side of the marker has the room, and a nudge here would fight the
  // flip it makes — the card jumping from one side of its marker to the other.
  if (
    card.height > frame.height - 2 * POPUP_EDGE_MARGIN ||
    card.width > frame.width - 2 * POPUP_EDGE_MARGIN
  ) {
    return;
  }

  let dx = 0;
  let dy = 0;

  /*
    Signs, and they are the trap in this arithmetic.
    `panBy(offset)` moves the *camera* by that offset, so the card — which is
    content — travels the other way: measured in the browser, `panBy([0, -100])`
    pushes a card 100px **down** the screen. Both deltas below are therefore the
    overflow with its sign flipped, which reads backwards and is why it is written
    out rather than left to be intuited.
  */
  const outsideLeft = frame.left + POPUP_EDGE_MARGIN - card.left;
  const outsideRight = card.right - (frame.right - POPUP_EDGE_MARGIN);
  if (outsideLeft > 0) dx = -outsideLeft;
  else if (outsideRight > 0) dx = outsideRight;

  const outsideTop = frame.top + POPUP_EDGE_MARGIN - card.top;
  const outsideBottom = card.bottom - (frame.bottom - POPUP_EDGE_MARGIN);
  if (outsideTop > 0) dy = -outsideTop;
  else if (outsideBottom > 0) dy = outsideBottom;

  if (dx !== 0 || dy !== 0) {
    /* Instantaneous: a keep-in-view nudge arriving via ease left 28px of
       residual clipping behind. The popup entrance carries the movement, so a
       snappy camera is fine. */
    map.panBy([dx, dy], { duration: 0 });
  }
}

/**
 * Swaps the markers on the map for a new set of clusters.
 *
 * Module-level, taking its refs as arguments, so the effect that calls it has a
 * stable dependency. Declared inside the hook it was a function identity that
 * changed on every render — the kind of thing a dependency array cannot state
 * honestly, and which sent the linter looking for a missing entry.
 */
function rebuildMarkers(
  map: MapLibreMap,
  clusters: readonly MapPlace[],
  markers: Map<string, Marker>,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  leaving: HTMLElement[],
  /**
   * The two callbacks, through refs rather than as values.
   *
   * Refs because a marker outlives the data it was built from and its handlers
   * must read the *current* callback, not the one that was current when the pin
   * was placed: the pick handler reaches the container, which rebuilds on every
   * page turn.
   */
  handlers: {
    onPick: RefObject<((id: string) => void) | undefined>;
    onHover: RefObject<((id: string | null) => void) | undefined>;
    onMarkerSelect: RefObject<
      | ((point: { id: string; latitude: number; longitude: number }) => void)
      | undefined
    >;
  },
) {
  const active = markers;
  const nextKeys = new Set(clusters.map((place) => place.key));

  for (const [key, marker] of active) {
    if (!nextKeys.has(key)) {
      active.delete(key);
      livePlaces.delete(key);
      startLeaving(marker, leaving);
    }
  }

  for (const place of clusters) {
    const isCluster = place.count > 1;
    const key = place.key;
    const existing = active.get(key);

    /**
     * Reused rather than rebuilt, and this is what makes the animation legible.
     *
     * A key is built from the places it covers, so the same key means the same
     * group — the only thing that can have changed is its count. Rebuilding it
     * anyway (which is what this did) meant that panning one pin across another
     * tore down and recreated *every* marker on the map: unaffected dots blinked
     * out and in for no reason, and the ones that had nothing to do with the
     * gesture were the most noticeable.
     */
    if (existing) {
      existing.setLngLat([place.longitude, place.latitude]);
      relabel(existing.getElement(), place, isCluster);
      livePlaces.set(key, place);
      continue;
    }

    const node = document.createElement("button");
    node.type = "button";
    // One `className` assignment rather than `classList.add` afterwards:
    // `classList.add` takes a single token and throws on a space, so a
    // two-class string built anywhere takes the whole map down.
    node.className = cn(MARKER_CLASS, isCluster && MARKER_CLUSTER_CLASS);
    node.dataset.ids = place.listings.map((l) => l.id).join(",");
    node.append(document.createElement("span"));

    const dot = node.firstElementChild as HTMLElement;
    dot.className = cn(MARKER_DOT_CLASS, isCluster && MARKER_DOT_CLUSTER_CLASS);

    relabel(node, place, isCluster);
    livePlaces.set(key, place);

    /**
     * Every handler below reads the place out of `livePlaces` rather than
     * closing over the one this marker was built with.
     *
     * The two used to be the same object, back when each marker was rebuilt on
     * every pass and nothing survived a rebuild. Now that a marker outlives the
     * data it was made from, a captured place goes stale the moment a posting is
     * added to a practice that already had a key — and the popup opens listing
     * openings the practice no longer has, with no way to tell it is stale.
     */
    const current = () => livePlaces.get(key);

    node.addEventListener("click", (event) => {
      // MapLibre closes any open popup when the map is clicked, and a marker
      // sits *inside* the map: left alone this click opened the popup and then
      // bubbled up and closed it again on the same event.
      event.stopPropagation();

      openPopupForKey(key, livePlaces, popupRef, map, {
        onPick: handlers.onPick.current,
        onHover: handlers.onHover.current,
        onMarkerSelect: handlers.onMarkerSelect.current,
      });
    });

    /**
     * Double-click takes the camera to the place.
     *
     * `stopPropagation` is not tidiness. MapLibre binds its own double-click
     * zoom on the canvas container — the very element markers are appended to —
     * so an event left to bubble runs both: this handler, then MapLibre's, which
     * zooms a further step past the offer and is no longer looking at it.
     *
     * A shortcut, not the only way in: a double-click cannot be pressed from a
     * keyboard, which is why the popup carries the same move as a button.
     */
    node.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const live = current();
      if (live) zoomToPlace(map, live);
    });

    const marker = new maplibregl.Marker({ element: node, anchor: "center" })
      .setLngLat([place.longitude, place.latitude])
      .addTo(map);

    /**
     * The entrance plays once, then the class is dropped.
     *
     * Left on, the marker would still match `.is-entering` later — including
     * while `.is-leaving` is animating the same dot, where the two keyframes
     * fight over the same property and the dot freezes halfway at whatever scale
     * won. `animationend` rather than a timeout, so the class never outlives the
     * animation it exists for. The global reduced-motion switch sets the
     * duration to 0s, and the event still fires.
     */
    node.classList.add("is-entering");
    dot.addEventListener(
      "animationend",
      () => node.classList.remove("is-entering"),
      { once: true },
    );

    active.set(key, marker);
  }
}

/**
 * Takes the camera to one place.
 *
 * The arithmetic lives in `cameraTargetFor`; this is only the camera call, kept
 * here so the hook stays the one place that knows what a map object is.
 *
 * Framing a group rather than centring it is the point of the whole gesture: a
 * cluster's coordinates are the mean of the practices it covers, so flying to
 * that mean reproduces the cluster — the reader zooms and the same dot is still
 * there. Framing its members is what makes them separate, and the re-clustering
 * the zoom triggers is what spreads them back out.
 */
function zoomToPlace(map: MapLibreMap, place: MapPlace) {
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

/** What a dot says: the count on a group, and what the button announces. */ function relabel(
  node: HTMLElement,
  place: MapPlace,
  isCluster: boolean,
) {
  const dot = node.firstElementChild;

  if (dot) {
    /*
     * The two states hold different elements — a glyph on a lone posting, a
     * number on a group — and one place can be both across two passes: pan a
     * pair apart and a cluster becomes two single markers again.
     *
     * `textContent` is what clears the other state, because setting it drops
     * every child: the count is set outright and the glyph is re-appended after
     * the clear. The `svg` check keeps a glyph that is already there rather than
     * rebuilding it on every re-label of an untouched marker.
     */
    if (isCluster) {
      const count = String(place.count);
      if (dot.textContent !== count) dot.textContent = count;
    } else if (dot.firstElementChild?.tagName !== "svg") {
      dot.textContent = "";
      dot.append(markerGlyph());
    }
  }

  node.setAttribute(
    "aria-label",
    isCluster
      ? `${place.count} annonces à ${place.listings[0].practiceName}`
      : `${place.listings[0].title}, ${place.listings[0].practiceName}`,
  );
}

/**
 * The glyph inside a lone posting's disc, and the number inside a group's.
 *
 * Both are set in pixels rather than `size-*` classes: the theme's spacing unit
 * is 0.3rem, so `size-3` is not the 12px its name suggests. Built as DOM rather
 * than imported — this hook creates its own nodes and has no React root, so a
 * component would have to be mounted into the marker.
 *
 * `svg` is created in the SVG namespace: `createElement` on an `<svg>` tag
 * yields an HTML element, which renders nothing at all.
 *
 * Decorative by construction: the button carries the posting's name in its
 * `aria-label` (see `relabel`), and a glyph a screen reader would announce with
 * no name attached would be noise.
 */
const MARKER_GLYPH_SIZE = 11;

function markerGlyph(): SVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(MARKER_GLYPH_SIZE));
  svg.setAttribute("height", String(MARKER_GLYPH_SIZE));
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(NS, "path");
  path.setAttribute(
    "d",
    "M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm-9 4.5 9 4.75 9-4.75M12 12.25V21",
  );
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);

  return svg;
}

/**
 * Animates a marker out, then drops it.
 *
 * `marker.remove()` unmounts the element immediately, so there is nothing left to
 * animate. The node is therefore detached *and re-attached to the parent it was
 * already in* — re-appending the same element keeps the transform MapLibre last
 * wrote on it, so the dot contracts where it stood rather than jumping somewhere
 * else on its way out.
 *
 * The re-attached node is no longer MapLibre's to clean up, which is why the
 * caller keeps it in a list and the hook's teardown clears it: a zoom gesture
 * that unmounts the map mid-fade would otherwise leave dots behind on a canvas
 * that is being torn down.
 */
function startLeaving(marker: Marker, leaving: HTMLElement[]) {
  const node = marker.getElement();
  const parent = node.parentNode;
  marker.remove();
  if (!parent) return;

  parent.appendChild(node);
  node.classList.add("is-leaving");
  node.firstElementChild?.addEventListener(
    "animationend",
    () => node.remove(),
    { once: true },
  );
  leaving.push(node);
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
function clusterPlaces(
  map: MapLibreMap,
  places: readonly MapPlace[],
): MapPlace[] {
  if (places.length < 2) {
    return [...places];
  }

  const points = places.map((place) => ({
    place,
    point: map.project([place.longitude, place.latitude]),
  }));

  const merged = new Array(points.length).fill(false);
  const clusters: MapPlace[] = [];

  for (let i = 0; i < points.length; i++) {
    if (merged[i]) continue;

    const members = [points[i].place];
    merged[i] = true;

    for (let j = i + 1; j < points.length; j++) {
      if (merged[j]) continue;
      if (points[i].point.dist(points[j].point) < CLUSTER_RADIUS_PX) {
        members.push(points[j].place);
        merged[j] = true;
      }
    }

    clusters.push(members.length === 1 ? members[0] : mergePlaces(members));
  }

  return clusters;
}

/**
 * How close two markers have to be, in pixels, to count as one.
 *
 * A marker is around 28px across, so 44 leaves them touching but still told
 * apart: close enough that a reader would call them one blob, far enough that
 * neither looks as though it swallowed the other.
 */
const CLUSTER_RADIUS_PX = 44;

/** One marker standing for several places: at their centre, holding all of them. */
function mergePlaces(members: MapPlace[]): MapPlace {
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

/**
 * Frames every place on the map.
 *
 * `fitBounds` rather than a fixed centre: the reader opened the page to see where
 * the work is, and a map centred on Paris because the default view was written
 * there says nothing about a posting in Nantes. Guarded against a single place —
 * `fitBounds` on one point leaves the camera at an undefined zoom.
 */
function fitToPlaces(map: MapLibreMap, places: readonly MapPlace[]) {
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
 * Marks the marker covering the row the reader is pointing at, and the one they
 * have chosen.
 *
 * Two marks, because the two states are two marks: hovering is a *preview* — a
 * soft ink ring that says « this pin is that row » — and the choice is the
 * reference's own solid cream ring, which says « this one ». They were one value
 * before, so a selection lasted exactly as long as the mouse did, and the row a
 * reader had clicked went dark the moment they moved.
 *
 * The selection outranks the preview on the same marker rather than replacing
 * it: pointing at the row you already chose keeps the cream ring, because the
 * marker is still the chosen one.
 */
/** Where a marker stands, read rather than assumed. */
function markerPoint(marker: Marker) {
  const at = marker.getLngLat();
  return { lng: at.lng, lat: at.lat };
}

function paintStates(
  markers: Map<string, Marker>,
  hoveredId: string | null | undefined,
  selected:
    | { id: string; latitude: number; longitude: number }
    | null
    | undefined,
) {
  for (const marker of markers.values()) {
    const ids = marker.getElement().dataset.ids?.split(",") ?? [];
    // Read once per marker rather than twice: the class toggles below both need
    // the same point, and MapLibre hands it back in degrees either way.
    const point = markerPoint(marker);
    // The preview: any id this marker covers is being pointed at.
    const coversHovered = hoveredId != null && ids.includes(hoveredId);
    // The choice: the id it covers *and* the marker standing at the coordinates
    // that were chosen, which is what tells a merged cluster from the practice it
    // covers. A cluster marker that still holds the posting is not the marker the
    // choice is about — the camera has not arrived yet.
    const coversSelected =
      selected != null &&
      ids.includes(selected.id) &&
      point.lng === selected.longitude &&
      point.lat === selected.latitude;

    marker.getElement().classList.toggle("is-preview", coversHovered);
    marker.getElement().classList.toggle("is-active", coversSelected);
  }
}

/**
 * Opens the chosen posting's card, once the map can honestly show it.
 *
 * The condition is the same one `paintStates` uses — the marker covers the id and
 * stands at its coordinates — so the card opens exactly when the cream ring
 * appears. That is the point of writing both off the same test: a posting picked
 * in the list comes with its card on the map, the reference's arrangement, but
 * only once the camera has landed. Opening at the pre-flight position would
 * anchor the card to a merged cluster the reader is no longer looking at.
 *
 * A no-op while the marker has not arrived, so the reopen after a re-cluster is
 * free rather than a thing to schedule.
 */
function openCardForSelected(
  markers: Map<string, Marker>,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  map: MapLibreMap,
  selected:
    | { id: string; latitude: number; longitude: number }
    | null
    | undefined,
  onPick: ((id: string) => void) | undefined,
) {
  if (!selected) return;

  for (const [key, marker] of markers) {
    const ids = marker.getElement().dataset.ids?.split(",") ?? [];
    if (!ids.includes(selected.id)) continue;
    if (
      marker.getLngLat().lng !== selected.longitude ||
      marker.getLngLat().lat !== selected.latitude
    ) {
      continue;
    }
    const place = livePlaces.get(key);
    if (!place) continue;

    // Already open on this very place: a re-cluster must not re-render a card
    // the reader is reading.
    const current = popupRef.current;
    const at = current?.getLngLat();
    if (at && at.lng === place.longitude && at.lat === place.latitude) {
      return;
    }

    openPopupForKey(key, livePlaces, popupRef, map, {
      onPick,
      onHover: undefined,
      onMarkerSelect: undefined,
    });
    return;
  }
}

/**
 * The popup body, built as DOM.
 *
 * This used to be a string handed to `setHTML`, behind a hand-written escaper.
 * That is a shape worth avoiding on its own terms: an escaper is a security
 * control, and a security control nobody can see being applied is one line away
 * from being bypassed the next time a field joins the template. `textContent`
 * does the same job by construction — no path through it turns a title into
 * markup, however creative the title is.
 *
 * Colours, surfaces and shadows are not here. They were `!important` overrides
 * on this hook once, aimed at `.maplibregl-popup` — which is not the element
 * MapLibre paints a surface on. `.maplibregl-popup-content` is, so the popup came
 * out as a dark frame around a white box: the overrides were landing on the wrong
 * node all along. They now sit in `globals.css` with the rest of the theming.
 *
 * What *is* here is the ink: the card the popup content sits on is white — the
 * reference's marker card, and the one element on this map allowed to be as
 * bright as the streets — so the text drawn into it is dark. Those classes are
 * here rather than in the stylesheet because they are drawn one node at a time,
 * with no class on a container to inherit from.
 *
 * The single-listing case is not the group case with fewer rows. With one posting
 * its title is the heading, and the list underneath used to repeat it — the same
 * sentence twice in a 300px box. A lone posting therefore gets heading, place and
 * period; several get a count, the place, and one entry each.
 *
 * `onPick` is what makes the popup a way *out* of the map rather than a dead end:
 * an entry selects its row and scrolls the list to it.
 *
 * The entry may name a posting that is not on the page in front of the reader.
 * The markers are built from the whole filtered collection (`/places`), not from
 * the rows on screen — that is the point of the map, and it is also why an entry
 * here is no guarantee the row exists. It is not this hook's problem to solve:
 * `pickListing` in the container turns to the page holding the id and scrolls
 * once those rows land, and the popup here only has to name the posting.
 */
function popupContent(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  onPick: (id: string) => void,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "flex flex-col gap-1 text-left";

  const [first] = place.listings;

  /*
   * The short reference on the first line — `#A1B2C3D4` — exactly as the
   * reference's marker card leads with `#AB045861` under « Electronics 25kg ».
   *
   * Eight characters of the listing id, upper-cased: enough to be quoted in a
   * phone call (« l'annonce #A1B2C3D4 ») and short enough to fit above a title
   * in a card this size. A group has no single id, so it states its count
   * instead.
   */
  const reference = document.createElement("p");
  reference.className =
    "text-[0.6875rem] leading-none font-semibold tracking-wide text-black/50 tabular-nums";
  reference.textContent =
    place.count === 1 ? `#${first.id.slice(0, 8).toUpperCase()}` : "";
  if (reference.textContent) {
    root.append(reference);
  }

  const heading = document.createElement("h3");
  heading.className = "text-sm leading-snug font-medium text-map-ink";
  heading.textContent =
    place.count === 1 ? first.title : `${place.count} annonces`;
  root.append(heading);

  const where = document.createElement("p");
  where.className = "text-xs text-black/55";
  where.textContent = `${first.practiceName} · ${first.city}`;
  root.append(where);

  if (place.count === 1) {
    const period = document.createElement("p");
    period.className = "mt-0.5 text-xs text-black/55";
    period.textContent = first.dateRange;
    root.append(period);
    root.append(zoomButton(place, map, dismiss));
    return root;
  }

  // A place can hold a lot of postings, and a cluster merges several practices —
  // so the list here can be long. It is capped at a handful and scrolls past that
  // rather than letting the popup grow down the map. The cap is 8rem and not
  // 13: the card has to fit the map, and the map is half a screen tall at best —
  // a list that fills the whole card makes a card taller than the map on a short
  // window, which no amount of anchoring can rescue. Three rows of preview reach
  // it anyway, so the scroll is a safety net rather than a routine.
  const shown = place.listings.slice(0, MAX_POPUP_LISTINGS);
  const list = document.createElement("ul");
  list.className =
    "mt-1 flex max-h-32 flex-col gap-1 overflow-y-auto overscroll-contain border-t border-black/10 pt-1.5";

  for (const listing of shown) {
    const item = document.createElement("li");

    // A button, not a span: the list and the map are two views of the same rows,
    // and this is the only way back from one to the other. Without it a popup is
    // a dead end — the reader reads what is at a place and has no way to go there.
    const row = document.createElement("button");
    row.type = "button";
    row.className =
      "flex w-full cursor-pointer flex-col rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-black/5";
    row.addEventListener("click", () => onPick(listing.id));
    // Same handle as the table rows carry, so the two views of a posting can be
    // matched from the outside — by the map's own tests, and by anything else that
    // has to say which row a pin belongs to.
    row.dataset.listingId = listing.id;

    const title = document.createElement("span");
    title.className = "text-xs leading-snug text-map-ink";
    title.textContent = listing.title;
    row.append(title);

    const meta = document.createElement("span");
    meta.className = "text-[0.6875rem] text-black/50";
    meta.textContent = listing.dateRange;
    row.append(meta);

    item.append(row);
    list.append(item);
  }

  root.append(list);

  // `count` is the whole place; `shown` is only the first few previews. The gap is
  // named rather than hidden, so the reader knows the scroll is not the end of what
  // sits here.
  const hidden = place.count - shown.length;
  if (hidden > 0) {
    const rest = document.createElement("p");
    rest.className = "mt-1 text-[0.6875rem] text-black/50";
    rest.textContent = `+ ${hidden} autre${hidden > 1 ? "s" : ""}`;
    root.append(rest);
  }

  root.append(zoomButton(place, map, dismiss));

  return root;
}

/**
 * The popup's "go there" button.
 *
 * A button, and the reason the popup is not a dead end in the other direction
 * either: the marker's double-click is a mouse shortcut nobody can reach from a
 * keyboard, so without this the camera move exists only for readers using a
 * pointer. It sits last in the box because it is what a reader reaches for once
 * they have read what the place holds, not before.
 *
 * Taking the move dismisses the whole popup, and the popup is the thing that has
 * to go rather than the button. It is anchored to this place's coordinates —
 * for a group, the mean of the practices it covers — which is exactly where the
 * markers it describes are about to separate into. Left open, the box lands on
 * top of the markers the reader just asked to see, and what they wanted revealed
 * is the one thing now hidden.
 *
 * Dismissed before the camera moves rather than after. A popup still in the DOM
 * is repositioned on every `move` frame, so one left to the end of the flight
 * would be carried across the viewport by it.
 */
function zoomButton(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "mt-1.5 flex w-full cursor-pointer items-center justify-center rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-black/70 transition-colors hover:bg-black/5 focus-visible:bg-black/5";

  const isCluster = place.count > 1;
  button.textContent = isCluster
    ? `Centrer sur ces ${place.count} cabinets`
    : "Centrer sur cette annonce";

  button.addEventListener("click", (event) => {
    // The popup lives inside the map container, so this click is a map click as
    // far as MapLibre is concerned and would dismiss the popup it lives in.
    event.stopPropagation();
    dismiss();
    zoomToPlace(map, place);
  });

  return button;
}

/**
 * How many postings a group popup lists before it scrolls.
 *
 * A practice can publish many openings, and a cluster merges several practices,
 * so the list here can be arbitrarily long. Past this many the list scrolls
 * inside itself rather than growing the popup down the map, where it would cover
 * the very pins it is describing and drift out of view.
 */
const MAX_POPUP_LISTINGS = 3;
