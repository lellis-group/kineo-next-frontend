"use client";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import { type RefObject, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { MapPlace } from "@/lib/listings";

/**
 * The marker's own geometry and colours. Its shadow, its hover emphasis and its
 * selected ring live in `globals.css`, next to the rest of the MapLibre theming.
 *
 * No `hover:scale` here, and that is not a style choice. MapLibre centres a
 * marker with a `translate(-50%, -50%)` expressed as a percentage of its own
 * box, so growing the marker on hover moves it — measured at nearly 50px, on a
 * button the reader had merely pointed at. Anything that changes a marker's size
 * is off the table; the emphasis is a ring instead.
 */
const MARKER_CLASS =
  "grid size-6 cursor-pointer place-items-center rounded-full border-2 border-background bg-foreground text-[0.625rem] font-semibold text-background";

/** A place with more than one posting: bigger, and it carries the count. */
const MARKER_CLUSTER_CLASS = "!size-7 !bg-primary";

export const POPUP_CLASS =
  "!max-w-64 !rounded-xl !border !border-border !bg-surface !p-4 !text-foreground !shadow-[var(--shadow-pop)]";

/**
 * The markers on the map, and the popup one of them opens.
 *
 * Everything here changes with the data; the map instance it draws on does not.
 * That split is the reason this is not the same hook as the instance's: reading
 * "the pins are wrong" should not mean reading how the WebGL context was made.
 *
 * The popup is rendered here rather than in the component because opening one is
 * a consequence of clicking a marker, and a marker is a node this hook owns.
 */
export function useMapMarkers({
  mapRef,
  places,
  ready,
  activeListingId,
  onActiveListingChange,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  places: MapPlace[];
  /** The map reports its style loaded; nothing is added before then. */
  ready: boolean;
  activeListingId?: string | null;
  onActiveListingChange?: (id: string | null) => void;
}) {
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  /**
   * Handlers and the current selection are read through refs rather than being
   * effect dependencies. They are only ever called from inside DOM listeners,
   * and listing them would tear down and rebuild every marker on every row
   * hover — which is the one thing this screen does most.
   */
  const onSelectRef = useRef(onActiveListingChange);
  onSelectRef.current = onActiveListingChange;

  const activeIdRef = useRef(activeListingId);
  activeIdRef.current = activeListingId;

  /** The places the camera was last framed on, so a refit is not repeated. */
  const lastFramedRef = useRef<MapPlace[] | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) {
      return;
    }

    const active = markersRef.current;
    const nextKeys = new Set(places.map((place) => place.key));

    for (const [key, marker] of active) {
      if (!nextKeys.has(key)) {
        marker.remove();
        active.delete(key);
      }
    }

    for (const place of places) {
      // Rebuilt wholesale rather than repositioned: the button carries the count
      // and the practice name, so a place that changed has to swap its node.
      active.get(place.key)?.remove();

      const node = document.createElement("button");
      node.type = "button";
      const isCluster = place.listings.length > 1;
      // One `className` assignment rather than `classList.add` afterwards:
      // `classList.add` takes a single token and throws on a space, so a
      // two-class string built anywhere takes the whole map down.
      node.className = cn(MARKER_CLASS, isCluster && MARKER_CLUSTER_CLASS);
      node.dataset.ids = place.listings.map((l) => l.id).join(",");

      if (isCluster) {
        node.textContent = String(place.listings.length);
        node.setAttribute(
          "aria-label",
          `${place.listings.length} annonces à ${place.listings[0].practiceName}`,
        );
      } else {
        node.setAttribute(
          "aria-label",
          `${place.listings[0].title}, ${place.listings[0].practiceName}`,
        );
      }

      node.addEventListener("click", (event) => {
        // MapLibre closes any open popup when the map is clicked, and a marker
        // sits *inside* the map: left alone this click opened the popup and then
        // bubbled up and closed it again on the same event.
        event.stopPropagation();

        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          offset: 16,
          // Dismissed by its own close button, by Escape, or by opening another
          // one — not by the very click that opened it.
          closeOnClick: false,
          closeButton: true,
          className: POPUP_CLASS,
        })
          .setLngLat([place.longitude, place.latitude])
          .setDOMContent(popupContent(place))
          .addTo(map);

        // A place highlights every row it covers; a lone posting selects itself,
        // because with one posting there is nothing else to point at.
        if (place.listings.length === 1) {
          onSelectRef.current?.(place.listings[0].id);
        }
      });

      active.set(
        place.key,
        new maplibregl.Marker({ element: node, anchor: "center" })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map),
      );
    }

    // Re-framing is gated on the places having actually changed. Without the
    // guard the camera flies back to fit them every time this runs, and since the
    // reader re-renders this panel on every hover, the map could not be panned
    // for as long as it takes to pan it.
    if (places !== lastFramedRef.current) {
      lastFramedRef.current = places;
      fitToPlaces(map, places);
    }

    // Applied here too, so markers created after a selection was already made
    // come up highlighted rather than waiting for the next hover.
    paintActive(active, activeIdRef.current);
  }, [mapRef, places, ready]);

  // The table's hover state has to reach the marker, not just the other way.
  useEffect(() => {
    paintActive(markersRef.current, activeListingId);
  }, [activeListingId]);

  useEffect(() => {
    const dismiss = () => {
      popupRef.current?.remove();
      popupRef.current = null;
    };

    // MapLibre binds no Escape handler of its own, so a keyboard user could open
    // a popup and have no way to dismiss it. Bound here rather than by the
    // component because the popup is this hook's state: whoever opens a thing
    // closes it. On the document, because focus never moves into the popup — it
    // is not a focus trap and should not become one.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(
    () => () => {
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      popupRef.current?.remove();
    },
    [],
  );
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
 * Marks the marker covering the row the reader is pointing at.
 *
 * Module-level rather than a closure in the hook: two effects call it, and
 * keeping it outside means neither lists it as a dependency of its own.
 */
function paintActive(
  markers: Map<string, Marker>,
  activeId: string | null | undefined,
) {
  for (const marker of markers.values()) {
    // The rows are the selection and the pins are one per place among them, so a
    // place lights up when any of the rows it covers is pointed at.
    const covers = marker
      .getElement()
      .dataset.ids?.split(",")
      .includes(activeId ?? " ");
    marker.getElement().classList.toggle("is-active", Boolean(covers));
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
 * The class names are the app's own, so the popup reads like the rest of the
 * product rather than a widget dropped onto the map.
 */
function popupContent(place: MapPlace): HTMLElement {
  const root = document.createElement("div");
  root.className = "flex flex-col gap-1.5 text-left";

  const heading = document.createElement("p");
  heading.className = "text-sm font-semibold text-foreground";
  heading.textContent =
    place.listings.length === 1
      ? place.listings[0].title
      : `${place.listings.length} annonces`;
  root.append(heading);

  const where = document.createElement("p");
  where.className = "text-xs text-muted";
  where.textContent = `${place.listings[0].practiceName} · ${place.listings[0].city}`;
  root.append(where);

  // Every posting at this place is named, because the marker stands for all of
  // them and a popup showing one would hide the rest.
  for (const listing of place.listings) {
    const row = document.createElement("p");
    row.className = "text-xs text-muted";
    row.textContent = `${listing.title} — ${listing.dateRange}`;
    root.append(row);
  }

  return root;
}
