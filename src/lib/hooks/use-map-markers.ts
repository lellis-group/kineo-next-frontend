"use client";

import type * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { type RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { useLatest } from "@/lib/hooks/use-latest";
import { useMapDismiss } from "@/lib/hooks/use-map-dismiss";
import { useMapViewport } from "@/lib/hooks/use-map-viewport";
import type { MapPlace, MapPlaceListing } from "@/lib/listings";
import { fitToPlaces, flyToPoint } from "@/lib/map/camera";
import { framingKey } from "@/lib/map/camera-target";
import { clusterPlaces } from "@/lib/map/clustering";
import { paintStates, rebuildMarkers } from "@/lib/map/markers";
import { openCardForSelected } from "@/lib/map/popup";
import { markSelectedEntry } from "@/lib/map/popup-card";
import type { MapPoint } from "@/lib/map/types";

/** What the screen can ask of the map from outside it. */
export interface ListingsMapHandle {
  /** Flies the camera to one posting's coordinates, street level. */
  focusOn: (point: { latitude: number; longitude: number }) => void;
  framePlaces: (places: readonly MapPoint[]) => void;
}

/**
 * The markers on the map, and the popup one of them opens. The map instance
 * itself lives in `useMapInstance`.
 *
 * `hoveredListingId` is a preview that lives as long as the pointer;
 * `selectedListing` is a choice that outlives it.
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
  ready: boolean;
  hoveredListingId?: string | null;
  onHoveredChange?: (id: string | null) => void;
  /**
   * The chosen posting, with its coordinates: the popup only opens once a
   * marker stands at that point, which tells a merged cluster apart.
   */
  selectedListing?: {
    id: string;
    latitude: number;
    longitude: number;
  } | null;
  onSelectionClear?: () => void;
  onMarkerSelect?: (listing: MapPlaceListing) => void;
  /**
   * A posting chosen in a popup: scrolls to its row. Kept apart from the hover
   * callback so moving the mouse never scrolls the page.
   */
  onListingPick?: (listing: MapPlaceListing) => void;
  /** Soft navigation to the posting's page, from the popup's link. */
  onListingOpen?: (listing: MapPlaceListing) => void;
}) {
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  /** Dots mid-exit: MapLibre has let go of them, the teardown removes them. */
  const leavingRef = useRef<HTMLElement[]>([]);

  /** The place each marker currently stands for: handlers read this, not a capture. */
  const livePlacesRef = useRef<Map<string, MapPlace>>(new Map());

  // Refs rather than effect dependencies, or every row hover would rebuild
  // every marker.
  const onHoverRef = useLatest(onHoveredChange);
  const onPickRef = useLatest(onListingPick);
  const hoveredIdRef = useLatest(hoveredListingId);
  const selectedRef = useLatest(selectedListing);
  const onMarkerSelectRef = useLatest(onMarkerSelect);
  const onOpenRef = useLatest(onListingOpen);

  const lastFramedKeyRef = useRef<string | null>(null);

  const lastSignatureRef = useRef<string | null>(null);

  const viewport = useMapViewport(mapRef, ready);

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

    // Rebuild only when the set changes; MapLibre repositions existing markers.
    // An empty set has its own signature (""), so filtering to nothing clears.
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
          selected: selectedRef,
        },
      );
    }

    // Keyed on content, not identity: each navigation hands a fresh array, and
    // refitting on every page turn would undo the reader's own pan and zoom.
    const framedKey = framingKey(places);
    if (framedKey !== lastFramedKeyRef.current) {
      lastFramedKeyRef.current = framedKey;
      fitToPlaces(map, places);
    }

    // Applied here too, so markers created after a selection come up highlighted.
    paintStates(markersRef.current, hoveredIdRef.current, selectedRef.current);

    // Opens once a marker stands at the chosen coordinates — the camera may
    // still be flying.
    openCardForSelected(
      markersRef.current,
      livePlacesRef.current,
      popupRef,
      map,
      selectedRef.current,
      {
        onPick: onPickRef.current,
        onHover: onHoverRef.current,
        onOpen: onOpenRef.current,
      },
    );
  }, [mapRef, clusters, places, ready]);

  useEffect(() => {
    paintStates(markersRef.current, hoveredListingId, selectedRef.current);
  }, [hoveredListingId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    paintStates(markersRef.current, hoveredIdRef.current, selectedListing);
    // A row chosen from a group's card is marked on that card too.
    const card = popupRef.current?.getElement();
    if (card) markSelectedEntry(card, selectedListing?.id);
    // A dropped choice closes its card.
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
      {
        onPick: onPickRef.current,
        onHover: onHoverRef.current,
        onOpen: onOpenRef.current,
      },
    );
  }, [mapRef, ready, selectedListing]);

  useMapDismiss({ mapRef, ready, popupRef, onSelectionClear });

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

  /** Stable identity, so the map's imperative handle is not rebuilt. */
  const focusOn = useCallback(
    (point: { latitude: number; longitude: number }) => {
      const map = mapRef.current;
      if (map) flyToPoint(map, point);
    },
    [mapRef],
  );

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
