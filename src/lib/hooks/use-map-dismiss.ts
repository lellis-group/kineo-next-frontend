"use client";

import type * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import { type RefObject, useEffect } from "react";
import { useLatest } from "@/lib/hooks/use-latest";

/**
 * Escape, and the map's own background: the two ways a choice is dropped.
 *
 * MapLibre binds no Escape handler of its own, so a keyboard user could open a
 * popup and have no way to dismiss it. Bound by the markers hook rather than by
 * the component because the popup is that hook's state: whoever opens a thing
 * closes it. On the document, because focus never moves into the popup — it is
 * not a focus trap and should not become one.
 *
 * It clears the *selection* too, not just the card: the card belongs to the
 * choice, and a popup closed while the row stayed lit would be a ring with
 * nothing on the map to explain it. The click on the map's background does the
 * same — a second click on the marker re-opens, since markers stop their
 * propagation.
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
  }, [mapRef, ready, popupRef]);
}
