"use client";

import {
  forwardRef,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { CrosshairIcon, ExpandIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { useMapInstance } from "@/lib/hooks/use-map-instance";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
import { useMapMarkers } from "@/lib/hooks/use-map-markers";
import type { MapPlace, MapPlaceListing, MapPoint } from "@/lib/listings";

interface ListingsMapProps {
  places: MapPlace[];
  /**
   * The postings on the list's current page — not derived from `places`, which
   * covers the whole filtered collection.
   */
  pagePoints: readonly MapPoint[];
  unlocated: number;
  totalPlaces: number;
  truncated: boolean;
  hoveredListingId?: string | null;
  onHoveredChange?: (id: string | null) => void;
  /** The chosen posting, with the coordinates it was chosen at. */
  selectedListing?: { id: string; latitude: number; longitude: number } | null;
  onSelectionClear?: () => void;
  /** A pin click: a choice that survives the pointer leaving, unlike a hover. */
  onMarkerSelect?: (listing: MapPlaceListing) => void;
  /** A posting chosen in a popup: scrolls to its row. */
  onListingPick?: (listing: MapPlaceListing) => void;
  onListingOpen?: (listing: MapPlaceListing) => void;
  className?: string;
}

/**
 * The postings, on a map. A thin organism over `useMapInstance` (WebGL
 * context, lifecycle) and `useMapMarkers` (what sits on top). Client-only and
 * dynamically imported by its caller.
 *
 * The root carries `size-full` too: with the height only on the inner
 * container, MapLibre would measure a zero-height canvas.
 */
export const ListingsMap = forwardRef<ListingsMapHandle, ListingsMapProps>(
  function ListingsMap(
    {
      places,
      pagePoints,
      unlocated,
      totalPlaces,
      truncated,
      hoveredListingId,
      onHoveredChange,
      selectedListing,
      onSelectionClear,
      onMarkerSelect,
      onListingPick,
      onListingOpen,
      className,
    },
    ref,
  ) {
    const { containerRef, mapRef, ready, failed } = useMapInstance();

    const map = useMapMarkers({
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
    });

    useImperativeHandle(ref, () => map, [map]);

    if (failed) {
      return (
        <div
          className={cn(
            "flex size-full items-center justify-center rounded-card border border-border bg-map-base p-8 text-center text-sm text-map-ink",
            className,
          )}
        >
          La carte n&apos;a pas pu être chargée. Les annonces restent
          consultables dans la liste.
        </div>
      );
    }

    return (
      <div
        className={cn(
          "relative size-full overflow-hidden rounded-card",
          className,
        )}
        // `application`: the markers inside are focusable controls.
        role="application"
        aria-label="Carte des cabinets"
      >
        <div ref={containerRef} className="size-full" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-map-base text-sm text-black/55">
            Chargement de la carte…
          </div>
        )}

        {/*
          Framing is offered, never automatic: re-framing on every page turn
          would drag the camera away from where the reader put it.
        */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            type="button"
            aria-label="Cadrer les annonces de cette page"
            title="Cadrer les annonces de cette page"
            // A page with no geocoded practice has nothing to frame.
            disabled={pagePoints.length === 0}
            onClick={() => map.framePlaces(pagePoints)}
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-white text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.2)] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <CrosshairIcon className="size-4" />
          </button>

          <FullscreenToggle containerRef={containerRef} />
        </div>

        {/* The canvas says nothing to a screen reader; these counts do. */}
        <output
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 left-3 flex flex-col items-start gap-1.5"
        >
          {unlocated > 0 && (
            <p className="rounded-full bg-white px-3 py-1.5 text-2xs text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.12)]">
              {unlocated} annonce{unlocated > 1 ? "s" : ""} sans coordonnées,
              visible{unlocated > 1 ? "s" : ""} dans la liste seulement
            </p>
          )}

          {/* `/places` keeps the practices with the most open listings. */}
          {truncated && (
            <p className="rounded-full bg-white px-3 py-1.5 text-2xs text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.12)]">
              {places.length} cabinets sur {totalPlaces} représentés — les plus
              actives
            </p>
          )}
        </output>
      </div>
    );
  },
);

/**
 * Toggles the map's fullscreen — `requestFullscreen` on an element already
 * full screen throws.
 */
function FullscreenToggle({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    // The browser owns this state: Escape can leave full screen too.
    const sync = () => setFullscreen(document.fullscreenElement !== null);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  return (
    <button
      type="button"
      aria-label="Plein écran"
      aria-pressed={fullscreen}
      className="grid size-9 cursor-pointer place-items-center rounded-full bg-white text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.2)] transition-colors hover:bg-white"
      onClick={() => {
        const node = containerRef.current?.parentElement;
        if (!node) return;
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          node.requestFullscreen?.().catch(() => {});
        }
      }}
    >
      <ExpandIcon className="size-4" />
    </button>
  );
}
