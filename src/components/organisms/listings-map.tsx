"use client";

import { type RefObject, useMemo } from "react";
import { ExpandIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { useMapInstance } from "@/lib/hooks/use-map-instance";
import { useMapMarkers } from "@/lib/hooks/use-map-markers";
import { type BrowseListing, groupByLocation } from "@/lib/listings";

interface ListingsMapProps {
  listings: BrowseListing[];
  /** Id of the row the reader is pointing at, mirrored onto its markers. */
  activeListingId?: string | null;
  onActiveListingChange?: (id: string | null) => void;
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
  listings,
  activeListingId,
  onActiveListingChange,
  className,
}: ListingsMapProps) {
  const places = useMemo(() => groupByLocation(listings), [listings]);

  const { containerRef, mapRef, ready, failed } = useMapInstance();

  useMapMarkers({
    mapRef,
    places,
    ready,
    activeListingId,
    onActiveListingChange,
  });

  /** Postings the list shows and the map cannot — a practice never geocoded. */
  const unlocatedCount =
    listings.length -
    places.reduce((sum, place) => sum + place.listings.length, 0);

  if (failed) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted",
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
        "relative size-full overflow-hidden rounded-2xl",
        className,
      )}
    >
      <div ref={containerRef} className="size-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface text-sm text-muted">
          Chargement de la carte…
        </div>
      )}

      <FullscreenToggle containerRef={containerRef} />

      {unlocatedCount > 0 && (
        <p className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-3 py-1.5 text-[0.6875rem] text-muted backdrop-blur-sm">
          {unlocatedCount} annonce{unlocatedCount > 1 ? "s" : ""} sans
          coordonnées, visible{unlocatedCount > 1 ? "s" : ""} dans la liste
          seulement
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
      className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full border border-border bg-surface/90 text-foreground backdrop-blur-sm transition-colors hover:bg-surface-hover"
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
