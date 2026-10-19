"use client";

import { forwardRef, type RefObject, useImperativeHandle } from "react";
import { CrosshairIcon, ExpandIcon } from "@/components/atoms/icons";
import { cn } from "@/lib/cn";
import { useMapInstance } from "@/lib/hooks/use-map-instance";
import type { ListingsMapHandle } from "@/lib/hooks/use-map-markers";
import { useMapMarkers } from "@/lib/hooks/use-map-markers";
import type { MapPlace } from "@/lib/listings";

interface ListingsMapProps {
  places: MapPlace[];
  unlocated: number;
  /** Practices the filters matched, before the ceiling. */
  totalPlaces: number;
  truncated: boolean;
  /** Row the reader is pointing at — the preview state. */
  hoveredListingId?: string | null;
  onHoveredChange?: (id: string | null) => void;
  /**
   * The posting the reader has chosen, with the coordinates it was chosen at.
   *
   * Coordinates and all: the marker to open its card on is only the right one once
   * it stands at that point, which is how a merged cluster is told from the
   * practice it covers. The camera is still flying when the choice is made, so the
   * two travel together and the map decides it has arrived.
   */
  selectedListing?: { id: string; latitude: number; longitude: number } | null;
  /** Called when the reader drops the choice — Escape, or a click on the map. */
  onSelectionClear?: () => void;
  /**
   * Called when a marker is chosen — the mirror of the table's title button.
   *
   * A click on a pin is a *choice*, not a preview: its cream ring and its card
   * have to survive the pointer leaving, or the map's half of the screen could
   * never make a selection the way the table's now can.
   */
  onMarkerSelect?: (point: {
    id: string;
    latitude: number;
    longitude: number;
  }) => void;
  /**
   * A posting chosen in a popup — the reader wants its row, not its marker.
   *
   * Distinct from `onHoveredChange` because the two must not share a
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
 * the « frame this page » control beside it, and the count of postings that could
 * not be pinned.
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
 *
 * It exposes the handful of things the table half of the screen needs done to it
 * — fly to a posting, frame a page — through a handle, for the same reason the
 * table exposes `scrollToId`: the two halves are one set of rows seen two ways.
 */
export const ListingsMap = forwardRef<ListingsMapHandle, ListingsMapProps>(
  function ListingsMap(
    {
      places,
      unlocated,
      totalPlaces,
      truncated,
      hoveredListingId,
      onHoveredChange,
      selectedListing,
      onSelectionClear,
      onMarkerSelect,
      onListingPick,
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
    });

    // The screen's way in from the other side: the table asks the map to come to a
    // posting, or to frame the page it is showing. Exposed here rather than in the
    // hook's return because a handle is the component's contract, not the hook's.
    useImperativeHandle(ref, () => map, [map]);

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
        /*
          Names the canvas for a screen reader: the map itself is opaque to one,
          so the region is introduced by what it holds rather than left as an
          unlabelled box of tiles. `application` because the markers inside are
          real controls — focusable buttons a reader tabs into — not passive
          content a `region` or `figure` would imply.
        */
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
        The two chrome controls the reference puts over its map's top-right
        corner: the frame-this-page move, and the fullscreen toggle under it.

        The frame button is a *choice*, never an automatic one. Turning a page
        changes the rows on screen and the map covers the whole filtered
        collection, so re-framing on every page turn would drag the camera away
        from wherever the reader had just put it. Offered, it answers the one
        question the layout otherwise leaves open: where are *these* ten?
      */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            type="button"
            aria-label="Cadrer les annonces de cette page"
            title="Cadrer les annonces de cette page"
            // Disabled with nothing to frame: one page of ten postings all
            // unpublished-as-place is possible, and a button that flies to France
            // is worse than no button.
            disabled={places.length === 0}
            onClick={() => map.framePlaces(places)}
            className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.2)] backdrop-blur-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <CrosshairIcon className="size-4" />
          </button>

          <FullscreenToggle containerRef={containerRef} />
        </div>

        {/*
          The map's own counts, in one polite live region.

          A screen-reader user gets nothing from the canvas, so these are the
          only thing that tells them what the map is showing — and the numbers
          move whenever a filter changes. `aria-live="polite"` announces the new
          state when it settles rather than interrupting, and one region holds
          both lines so they are read together rather than as two separate
          announcements. The `<output>` element carries an implicit `status`
          role, which gives the region a name to hang the politeness on in
          the older readers that want one.
        */}
        <output
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 left-3 flex flex-col items-start gap-1.5"
        >
          {unlocated > 0 && (
            <p className="rounded-full bg-white/90 px-3 py-1.5 text-[0.6875rem] text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.12)] backdrop-blur-sm">
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
            <p className="rounded-full bg-white/90 px-3 py-1.5 text-[0.6875rem] text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.12)] backdrop-blur-sm">
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
      /*
        In the flow of the control column, and not absolutely positioned: this
        button used to carry its own `absolute top-3 right-3`, left over from
        before the column existed, which put it exactly on top of the « Cadrer »
        button beside it — the fullscreen one drawn second took every click, and
        the crosshair was the control that could not be pressed.
      */
      aria-label="Plein écran"
      className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-map-ink shadow-[0_2px_10px_rgb(22_21_15/0.2)] backdrop-blur-sm transition-colors hover:bg-white"
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
