import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import { cn } from "@/lib/cn";
import { zoomToPlace } from "@/lib/map/camera";
import { openPopupForKey } from "@/lib/map/popup";
import type { MapPlace, MapPlaceListing } from "./types";

/**
 * The markers: the node MapLibre positions, what is drawn inside it, and the
 * two states it can be in.
 *
 * Every node here is built as DOM rather than as React. MapLibre re-positions a
 * marker by writing a transform onto it every frame of a pan or a zoom, so
 * anything that changes what the box *measures* moves the pin under the
 * reader — and `document.createElement` is the honest shape anyway, since
 * there is no React root to mount into. The card is deliberately not here: it
 * opens from two doors (a pin, and a choice made in the table), and it lives in
 * `popup.ts` behind a function rather than as a branch in a listener.
 */

/**
 * The marker's box: sized here, positioned by MapLibre, and never animated.
 *
 * No `hover:scale` here, and that is not a style choice: MapLibre centres a
 * marker with a `translate(-50%, -50%)` expressed as a percentage of its own
 * box, so growing the marker on hover moves the pin — the emphasis is a ring
 * instead. `size-5` is 24px on this theme's 0.3rem unit; at 28px a map of
 * cabinets looks crowded past a dozen pins.
 *
 * The disc is a child element, and that is what buys the entrance animation: a
 * `scale` on the child leaves this box exactly as MapLibre sized it, so the
 * transform it writes keeps aiming at the same point while the disc grows
 * inside. See `.marker-dot` and `kineo-marker-enter` in `globals.css`.
 */
const MARKER_CLASS = "grid size-5 cursor-pointer place-items-center";

/** The mark inside a lone posting's disc — the reference's own. */
const MARKER_DOT_CLASS =
  "marker-dot grid size-full place-items-center rounded-full bg-background text-foreground";

/** A place with more than one posting: bigger, and it carries the count. */
const MARKER_CLUSTER_CLASS = "!size-6";
const MARKER_DOT_CLUSTER_CLASS = "!text-[0.625rem] !font-bold";

/**
 * Swaps the markers on the map for a new set of clusters.
 *
 * Module-level, taking its refs as arguments, so the effect that calls it keeps
 * a stable dependency instead of one that changes on every render.
 */
export function rebuildMarkers(
  map: MapLibreMap,
  clusters: readonly MapPlace[],
  markers: Map<string, Marker>,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  leaving: HTMLElement[],
  /**
   * The callbacks, through refs rather than as values.
   *
   * A marker outlives the data it was built from, so its handlers must read the
   * callback that is current *now* — the pick handler reaches the container,
   * which rebuilds on every page turn.
   */
  handlers: {
    onPick: RefObject<((listing: MapPlaceListing) => void) | undefined>;
    onHover: RefObject<((id: string | null) => void) | undefined>;
    onMarkerSelect: RefObject<((listing: MapPlaceListing) => void) | undefined>;
    onOpen: RefObject<((listing: MapPlaceListing) => void) | undefined>;
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
     * Reused rather than rebuilt, and this is what makes the entrance
     * animation legible: a rebuild during a pan tears down and recreates every
     * marker, the dots that had nothing to do with the gesture blinking out
     * and in.
     *
     * A key names the very group it covers, so the same key can only have
     * changed its count and its previews — a `setLngLat` plus a refresh is all
     * it needs.
     */
    if (existing) {
      existing.setLngLat([place.longitude, place.latitude]);
      refreshMarker(existing, place, isCluster, key, livePlaces);
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
     * A marker outlives its data: a captured place goes stale the moment a
     * posting joins a practice whose key is already on the map, and the popup
     * would open listing openings the practice no longer has.
     */
    const current = () => livePlaces.get(key);

    node.addEventListener("click", (event) => {
      // MapLibre closes any open popup when the map is clicked, and a marker
      // sits *inside* the map: without `stopPropagation` this click would open
      // the popup and bubble up to close it again on the same event.
      event.stopPropagation();

      openPopupForKey(key, livePlaces, popupRef, map, {
        onPick: handlers.onPick.current,
        onHover: handlers.onHover.current,
        onMarkerSelect: handlers.onMarkerSelect.current,
        onOpen: handlers.onOpen.current,
      });
    });

    /**
     * Double-click takes the camera to the place.
     *
     * `stopPropagation` is not tidiness. MapLibre binds its own double-click
     * zoom on the canvas container — the very element markers are appended to —
     * so an event left to bubble runs both handlers, and the camera zooms a
     * further step past the offer it is meant to land on.
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

/** What a dot says: the count on a group, and what the button announces. */
function relabel(node: HTMLElement, place: MapPlace, isCluster: boolean) {
  const dot = node.firstElementChild;
  const [first] = place.listings;

  if (dot) {
    /*
      The two states hold different elements — a glyph on a lone posting, a
      number on a group — and one place can be both across two passes: pan a
      pair apart and a cluster becomes two single markers again.

      `textContent` is what clears the other state, because setting it drops
      every child: the count is set outright and the glyph is re-appended after
      the clear. The `svg` check keeps a glyph that is already there rather than
      rebuilding it on every re-label of an untouched marker.
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
      ? `${place.count} annonces à ${first?.practiceName ?? "cabinet"}`
      : first
        ? `${first.title}, ${first.practiceName}`
        : `${place.count} annonces`,
  );
}

/**
 * Brings a marker kept from the last pass up to the place it now stands for.
 *
 * Two things a rebuild would have refreshed and a bare `setLngLat` does not:
 *
 * - the size classes, which the count decides — a lone posting grows into a
 *   count-bearing marker (or shrinks back) without the key changing, and
 *   leaving the disc one size out draws a dot that says « 12 » the size it says
 *   « 1 »;
 * - the ids stamped on the element, which `paintStates` and the popup's opener
 *   read back to decide which marker a hover or a selection lights. The
 *   previews a place holds change between read — a posting closes, another
 *   opens — and a stale stamp quietly drops the highlight off the row the
 *   reader is pointing at.
 */
function refreshMarker(
  marker: Marker,
  place: MapPlace,
  isCluster: boolean,
  key: string,
  livePlaces: Map<string, MapPlace>,
) {
  const node = marker.getElement();
  const wasCluster = (livePlaces.get(key)?.count ?? 1) > 1;

  if (wasCluster !== isCluster) {
    node.classList.toggle(MARKER_CLUSTER_CLASS);
    // The dot's two extra classes are one string by construction — the
    // creation path sets them together — so they are toggled together too.
    for (const token of MARKER_DOT_CLUSTER_CLASS.split(" ")) {
      node.firstElementChild?.classList.toggle(token);
    }
  }

  node.dataset.ids = place.listings.map((listing) => listing.id).join(",");
  relabel(node, place, isCluster);
  livePlaces.set(key, place);
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

/**
 * Marks the marker covering the row the reader is pointing at, and the one they
 * have chosen.
 *
 * Two marks, because the two states are two durations: hovering is a *preview*
 * — a soft ink ring that says « this pin is that row » — and the choice is a
 * solid cream ring that has to outlive the pointer that made it. The selection
 * outranks the preview on the same marker rather than replacing it: pointing at
 * the row you already chose keeps the cream ring, because the marker is still
 * the chosen one.
 */
export function paintStates(
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

    // A pressed pin announces its state the way the table's map button does
    // (`aria-pressed` there): the cream ring paints the choice for the pointer,
    // and this is the same choice in words. The hover stays paint-only — it is
    // the pointer, not a state, and « pressed » would lie about it.
    marker.getElement().classList.toggle("is-preview", coversHovered);
    marker.getElement().classList.toggle("is-active", coversSelected);
    marker
      .getElement()
      .setAttribute("aria-pressed", coversSelected ? "true" : "false");
  }
}

/** Where a marker stands, read rather than assumed. */
function markerPoint(marker: Marker) {
  const at = marker.getLngLat();
  return { lng: at.lng, lat: at.lat };
}
