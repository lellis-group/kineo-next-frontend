import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import { cn } from "@/lib/cn";
import type { MapPlace } from "@/lib/listings";
import { zoomToPlace } from "@/lib/map/camera";
import { openPopupForKey } from "@/lib/map/popup";

/**
 * The markers themselves: the node MapLibre positions, what is drawn inside it,
 * and the two states it can be in.
 *
 * Every node here is built as DOM rather than as React. MapLibre positions a
 * marker by writing a transform onto the element it is handed, and it does that
 * on every frame of a pan or a zoom — so anything that changes what the box
 * *measures* (a `hover:scale`, an intrinsic size) moves the pin under the
 * reader. A component would have to be mounted into a node that does not exist
 * yet; `document.createElement` is the honest shape for it.
 *
 * The popup is deliberately not here. It is the *card*, and it is opened from
 * two doors — a click on a pin, and a choice made in the table — which is why
 * it lives in `popup.ts` behind a function rather than as a branch in a listener.
 */

/**
 * The marker's box: sized here, positioned by MapLibre, and never animated.
 *
 * No `hover:scale` here, and that is not a style choice. MapLibre centres a
 * marker with a `translate(-50%, -50%)` expressed as a percentage of its own
 * box, so growing the marker on hover moves it — measured at nearly 50px, on a
 * marker the reader had merely pointed at. Anything that changes the *box* is off
 * the table; the emphasis is a ring instead.
 *
 * `size-5`, which on the theme's 0.3rem unit is 24px: the reference's discs are
 * a little smaller than this screen used to draw them, and at 28px a map of
 * cabinets starts to look crowded before there are more than a dozen pins.
 *
 * The disc is a child element, and that is what buys the entrance animation: a
 * `scale` on the child leaves this box exactly as MapLibre sized it, so the
 * transform it writes keeps aiming at the same point while the disc grows inside.
 * See `.marker-dot` and `kineo-marker-enter` in `globals.css`.
 */
const MARKER_CLASS = "grid size-5 cursor-pointer place-items-center";

/** The mark inside a lone posting's disc — the reference's own. */
const MARKER_DOT_CLASS =
  "marker-dot grid size-full place-items-center rounded-full bg-surface text-foreground";

/** A place with more than one posting: bigger, and it carries the count. */
const MARKER_CLUSTER_CLASS = "!size-6";
const MARKER_DOT_CLUSTER_CLASS = "!text-[0.625rem] !font-bold";

/**
 * Swaps the markers on the map for a new set of clusters.
 *
 * Module-level, taking its refs as arguments, so the effect that calls it has a
 * stable dependency. Declared inside the hook it was a function identity that
 * changed on every render — the kind of thing a dependency array cannot state
 * honestly, and which sent the linter looking for a missing entry.
 */
export function rebuildMarkers(
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
     * group — the only thing that can have changed is its count and its
     * previews. Rebuilding it anyway (which is what this did) meant that
     * panning one pin across another tore down and recreated *every* marker on
     * the map: unaffected dots blinked out and in for no reason, and the ones
     * that had nothing to do with the gesture were the most noticeable.
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

    marker.getElement().classList.toggle("is-preview", coversHovered);
    marker.getElement().classList.toggle("is-active", coversSelected);
  }
}

/** Where a marker stands, read rather than assumed. */
function markerPoint(marker: Marker) {
  const at = marker.getLngLat();
  return { lng: at.lng, lat: at.lat };
}
