"use client";

import type { RefObject } from "react";
import { ExpandIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { useMapInstance } from "@/lib/hooks/use-map-instance";
import { useMapMarkers } from "@/lib/hooks/use-map-markers";
import type { MapPlace } from "@/lib/listings";

interface ListingsMapProps {
  places: MapPlace[];
  unlocated: number;
  /** Practices the filters matched, before the ceiling. */
  totalPlaces: number;
  truncated: boolean;
  /** Id of the row the reader is pointing at, mirrored onto its markers. */
  activeListingId?: string | null;
  onActiveListingChange?: (id: string | null) => void;
  /**
   * A posting chosen in a popup — the reader wants its row, not its marker.
   *
   * Distinct from `onActiveListingChange` because the two must not share a
   * handler: pointing at a row highlights a marker, but choosing a posting scrolls
   * the list. Sharing one callback would make the mouse dragging across the table
   * scroll the page under the reader.
   */
  onListingPick?: (id: string) => void;
  className?: string;
}

/**
 * The postings, on a map.
 *
 * An organism, and a deliberately thin one: the canvas, the two states the map
 * itself cannot express (loading, and no WebGL at all), the fullscreen control,
 * and the count of postings that could not be pinned.
 *
 * The two behaviours live in `useMapInstance` — the WebGL context, the style, the
 * lifecycle — and `useMapMarkers`, which owns what sits on top. They are split
 * because exactly one of them changes with the data; folding them together was
 * what made this file hard to change, since a fix to the pins meant re-reading
 * how the context is built and vice versa.
 *
 * The root carries `size-full`, not only its inner container. MapLibre measures
 * the element it is handed, which is that inner container; with the height only
 * on the child, a parent of `height: auto` resolves the child's `height: 100%`
 * to nothing and the canvas comes out zero pixels tall.
 *
 * Client-only, and dynamically imported by its caller: MapLibre needs a WebGL
 * context and a `window`, neither of which exist during a server render.
 */
export function ListingsMap({
  places,
  unlocated,
  totalPlaces,
  truncated,
  activeListingId,
  onActiveListingChange,
  onListingPick,
  className,
}: ListingsMapProps) {
  const { containerRef, mapRef, ready, failed } = useMapInstance();

  useMapMarkers({
    mapRef,
    places,
    ready,
    activeListingId,
    onActiveListingChange,
    onListingPick,
  });

  if (failed) {
    return (
      <div
        className={cn(
          // The map's own paper, not the page's: this state stands in for the
          // map, so it has to sit in the same place and the same light the tiles
          // would have filled.
          "flex size-full items-center justify-center rounded-card border border-border bg-map-base p-8 text-center text-sm text-map-ink",
          className,
        )}
      >
        La carte n&apos;a pas pu être chargée. Les annonces restent consultables
        dans la liste.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden rounded-card",
        className,
      )}
    >
      <div ref={containerRef} className="size-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-map-base text-sm text-black/55">
          Chargement de la carte…
        </div>
      )}

      <FullscreenToggle containerRef={containerRef} />

      {unlocated > 0 && (
        <p className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-[0.6875rem] text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.12)] backdrop-blur-sm">
          {unlocated} annonce{unlocated > 1 ? "s" : ""} sans coordonnées,
          visible{unlocated > 1 ? "s" : ""} dans la liste seulement
        </p>
      )}

      {/* The ceiling, stated with a count. A flag with no figure behind it
          invites the reader to hunt for what is missing.

          "Les plus actives" is what `/places` does: it ranks practices by open
          listing count and keeps the top `maxPlaces`, so the ones left off are
          the quietest, not the oldest or the furthest. */}
      {truncated && (
        <p className="absolute bottom-12 left-3 rounded-full bg-white/90 px-3 py-1.5 text-[0.6875rem] text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.12)] backdrop-blur-sm">
          {places.length} cabinets sur {totalPlaces} représentés — les plus
          actives
        </p>
      )}
    </div>
  );
}

/**
 * Expands the map to the viewport.
 *
 * Toggles rather than only expands: `requestFullscreen` on a map that is already
 * full screen throws, and a button that can get into a state it cannot leave is
 * a dead end.
 *
 * White on a light map, which is where the reference draws its own expand mark:
 * the glyph is ink on paper, and the plate under it is there to give the target an
 * edge rather than to colour it. The shadow is what separates it from a street
 * the same shade of white.
 */
function FullscreenToggle({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <button
      type="button"
      aria-label="Plein écran"
      className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.2)] backdrop-blur-sm transition-colors hover:bg-white"
      onClick={() => {
        const node = containerRef.current?.parentElement;
        if (!node) return;
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          node.requestFullscreen?.();
        }
      }}
    >
      <ExpandIcon className="size-4" />
    </button>
  );
}
