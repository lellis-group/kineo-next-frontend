"use client";

import type * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import { type RefObject, useEffect } from "react";
import { useLatest } from "@/lib/hooks/use-latest";

/**
 * Escape and a click on the map's background drop the choice (popup and
 * selection together). MapLibre binds no Escape of its own.
 */
export function useMapDismiss({
  mapRef,
  ready,
  popupRef,
  onSelectionClear,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  ready: boolean;
  popupRef: RefObject<maplibregl.Popup | null>;
  onSelectionClear?: () => void;
}) {
  const onSelectionClearRef = useLatest(onSelectionClear);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return undefined;

    const dismiss = () => {
      popupRef.current?.remove();
      popupRef.current = null;
      onSelectionClearRef.current?.();
    };

    // Ignore clicks inside the popup, which bubble here from its entries.
    const onMapClick = (event: maplibregl.MapMouseEvent) => {
      const target = event.originalEvent?.target as HTMLElement | null;
      if (target?.closest(".maplibregl-popup")) return;
      // The second click of a double-click belongs to MapLibre's zoom.
      if ((event.originalEvent?.detail ?? 1) > 1) return;
      dismiss();
    };

    // Only when focus is nowhere or inside the map: the toolbar's popover and
    // fields handle their own Escape.
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
  }, [mapRef, ready, popupRef]);
}
