import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import { cn } from "@/lib/cn";
import { zoomToPlace } from "@/lib/map/camera";
import { openPopupForKey } from "@/lib/map/popup";
import type { MapPlace, MapPlaceListing } from "./types";

/**
 * The map markers. Built as DOM rather than React: MapLibre positions them by
 * writing a transform every frame, and there is no React root to mount into.
 */

/**
 * The marker's box: sized here, positioned by MapLibre, and never animated.
 * MapLibre centres it with a percentage translate of its own box, so scaling it
 * would move the pin — animations go on the child disc (`.marker-dot`).
 */
const MARKER_CLASS = "grid size-5 cursor-pointer place-items-center";

const MARKER_DOT_CLASS =
  "marker-dot grid size-full place-items-center rounded-full bg-background text-foreground";

/** A place with more than one posting: bigger, and it carries the count. */
const MARKER_CLUSTER_CLASS = "!size-6";
const MARKER_DOT_CLUSTER_CLASS = "!text-[0.625rem] !font-bold";

/**
 * Swaps the markers on the map for a new set of clusters. Module-level, so the
 * calling effect keeps a stable dependency.
 */
export function rebuildMarkers(
  map: MapLibreMap,
  clusters: readonly MapPlace[],
  markers: Map<string, Marker>,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  leaving: HTMLElement[],
  /** Refs, because a marker outlives the callbacks it was built with. */
  handlers: {
    onPick: RefObject<((listing: MapPlaceListing) => void) | undefined>;
    onHover: RefObject<((id: string | null) => void) | undefined>;
    onMarkerSelect: RefObject<((listing: MapPlaceListing) => void) | undefined>;
    onOpen: RefObject<((listing: MapPlaceListing) => void) | undefined>;
    selected: RefObject<{ id: string } | null | undefined>;
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

    // Reused rather than rebuilt, so untouched dots don't replay their entrance
    // during a pan.
    if (existing) {
      existing.setLngLat([place.longitude, place.latitude]);
      refreshMarker(existing, place, isCluster, key, livePlaces);
      continue;
    }

    const node = document.createElement("button");
    node.type = "button";
    // `className` rather than `classList.add`, which throws on a space.
    node.className = cn(MARKER_CLASS, isCluster && MARKER_CLUSTER_CLASS);
    node.dataset.ids = place.listings.map((l) => l.id).join(",");
    node.append(document.createElement("span"));

    const dot = node.firstElementChild as HTMLElement;
    dot.className = cn(MARKER_DOT_CLASS, isCluster && MARKER_DOT_CLUSTER_CLASS);

    relabel(node, place, isCluster);
    livePlaces.set(key, place);

    // Read from `livePlaces` rather than captured: a marker outlives its data.
    const current = () => livePlaces.get(key);

    node.addEventListener("click", (event) => {
      // Otherwise the click bubbles to the map, which closes the popup it opens.
      event.stopPropagation();

      // The second click of a double-click belongs to the zoom below.
      if (event.detail > 1) return;

      openPopupForKey(key, livePlaces, popupRef, map, {
        onPick: handlers.onPick.current,
        onHover: handlers.onHover.current,
        onMarkerSelect: handlers.onMarkerSelect.current,
        onOpen: handlers.onOpen.current,
        selectedId: handlers.selected.current?.id,
      });
    });

    // Double-click zooms to the place. `stopPropagation` keeps MapLibre's own
    // double-click zoom on the container from adding a further step.
    node.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const live = current();
      if (!live) return;
      popupRef.current?.remove();
      popupRef.current = null;
      zoomToPlace(map, live);
    });

    const marker = new maplibregl.Marker({ element: node, anchor: "center" })
      .setLngLat([place.longitude, place.latitude])
      .addTo(map);

    // Dropped after the entrance, or it would fight `.is-leaving` later.
    node.classList.add("is-entering");
    dot.addEventListener(
      "animationend",
      () => node.classList.remove("is-entering"),
      { once: true },
    );

    active.set(key, marker);
  }
}

function relabel(node: HTMLElement, place: MapPlace, isCluster: boolean) {
  const dot = node.firstElementChild;
  const [first] = place.listings;

  if (dot) {
    // A glyph on a lone posting, a number on a group; setting `textContent`
    // clears whichever was there.
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
 * Brings a reused marker up to date: the size classes (the count decides
 * them) and the ids `paintStates` reads back.
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
    for (const token of MARKER_DOT_CLUSTER_CLASS.split(" ")) {
      node.firstElementChild?.classList.toggle(token);
    }
  }

  node.dataset.ids = place.listings.map((listing) => listing.id).join(",");
  relabel(node, place, isCluster);
  livePlaces.set(key, place);
}

/** In pixels: the theme's 0.3rem spacing unit makes `size-3` not 12px. */
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
 * Animates a marker out, then drops it. `marker.remove()` unmounts at once, so
 * the node is re-attached to its parent (keeping MapLibre's last transform) to
 * play the exit. It is no longer MapLibre's to clean up, hence `leaving`.
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

/** Marks the marker covering the hovered row, and the one chosen. */
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
    const point = markerPoint(marker);
    const coversHovered = hoveredId != null && ids.includes(hoveredId);
    // The coordinates tell a merged cluster from the practice it covers.
    const coversSelected =
      selected != null &&
      ids.includes(selected.id) &&
      point.lng === selected.longitude &&
      point.lat === selected.latitude;

    marker.getElement().classList.toggle("is-preview", coversHovered);
    marker.getElement().classList.toggle("is-active", coversSelected);
    marker
      .getElement()
      .setAttribute("aria-pressed", coversSelected ? "true" : "false");
  }
}

function markerPoint(marker: Marker) {
  const at = marker.getLngLat();
  return { lng: at.lng, lat: at.lat };
}
