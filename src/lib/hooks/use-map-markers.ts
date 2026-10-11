"use client";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { cameraTargetFor, type MapPlace } from "@/lib/listings";

/**
 * The marker's box: sized here, positioned by MapLibre, and never animated.
 *
 * No `hover:scale` here, and that is not a style choice. MapLibre centres a
 * marker with a `translate(-50%, -50%)` expressed as a percentage of its own
 * box, so growing the marker on hover moves it — measured at nearly 50px, on a
 * button the reader had merely pointed at. Anything that changes the *box* is off
 * the table; the emphasis is a ring instead.
 *
 * The dot is a child element, and that is what buys the entrance animation: a
 * `scale` on the child leaves this box exactly as MapLibre sized it, so the
 * transform it writes keeps aiming at the same point while the dot grows inside.
 * See `.marker-dot` and `kineo-marker-enter` in `globals.css`.
 */
const MARKER_CLASS = "grid size-6 cursor-pointer place-items-center";

/** The visible round, and everything that is allowed to move. */
const MARKER_DOT_CLASS =
  "marker-dot grid size-full place-items-center rounded-full border-2 border-background bg-foreground text-[0.625rem] font-semibold text-background";

/** A place with more than one posting: bigger, and it carries the count. */
const MARKER_CLUSTER_CLASS = "!size-7";
const MARKER_DOT_CLUSTER_CLASS = "!bg-primary";

/**
 * How close the camera comes to a place the reader asked to look at.
 *
 * Street-level without going to the tile limit: OSM only publishes up to z19 and
 * `useMapInstance` caps the source there, so anything past this is MapLibre
 * enlarging a raster tile until it is visibly soft.
 */
const PLACE_ZOOM = 16;

/** Long enough to read as a camera move, short enough not to lose the reader. */
const FLY_DURATION = 600;

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
  onListingPick,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  places: MapPlace[];
  /** The map reports its style loaded; nothing is added before then. */
  ready: boolean;
  activeListingId?: string | null;
  onActiveListingChange?: (id: string | null) => void;
  /**
   * A posting chosen in a popup: the reader wants its row, not its marker.
   *
   * Kept apart from the hover callback because they must not be the same thing.
   * One drives a highlight the other drives a scroll, and merging them would make
   * the mouse moving across the table scroll the page under the reader.
   */
  onListingPick?: (id: string) => void;
}) {
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  /**
   * Dots mid-exit: MapLibre has let go of them, we have not.
   *
   * Not owned by any MapLibre object any more, so nothing else will ever remove
   * them. Cleared with the rest in the teardown below.
   */
  const leavingRef = useRef<HTMLElement[]>([]);

  /**
   * The place each marker currently stands for, by key.
   *
   * A marker outlives the data it was built from, so its handlers cannot close
   * over a place — they read this instead. One entry per marker, dropped with
   * the marker it belongs to.
   */
  const livePlacesRef = useRef<Map<string, MapPlace>>(new Map());

  /**
   * Handlers and the current selection are read through refs rather than being
   * effect dependencies. They are only ever called from inside DOM listeners,
   * and listing them would tear down and rebuild every marker on every row
   * hover — which is the one thing this screen does most.
   */
  const onSelectRef = useRef(onActiveListingChange);
  onSelectRef.current = onActiveListingChange;

  const onPickRef = useRef(onListingPick);
  onPickRef.current = onListingPick;

  const activeIdRef = useRef(activeListingId);
  activeIdRef.current = activeListingId;

  /** The places the camera was last framed on, so a refit is not repeated. */
  const lastFramedRef = useRef<MapPlace[] | null>(null);

  /** The cluster set on the map, so an unchanged one is not rebuilt. */
  const lastSignatureRef = useRef<string | null>(null);

  /**
   * The viewport as last seen, and the trigger for re-clustering.
   *
   * Which markers touch depends on the zoom *and* on where the map is scrolled —
   * panning two pins together merges them just as surely as zooming in does — so
   * the state carries the centre as well as the level. Null until the map has
   * settled once, which is also the signal that clustering can run at all.
   *
   * `zoomend`/`moveend` rather than `zoom` and `move`: the grouping only matters
   * once the reader lets go, and re-projecting on every frame of a pinch is work
   * spent on an answer nobody looks at until the gesture ends.
   */
  const [viewport, setViewport] = useState<Viewport | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) {
      return;
    }
    const onSettled = () => setViewport(viewportOf(map));
    map.on("zoomend", onSettled);
    map.on("moveend", onSettled);
    onSettled();
    return () => {
      map.off("zoomend", onSettled);
      map.off("moveend", onSettled);
    };
  }, [mapRef, ready]);

  const clusters = useMemo(
    () =>
      viewport && mapRef.current ? clusterPlaces(mapRef.current, places) : [],
    [viewport, places, mapRef],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || clusters.length === 0) {
      return;
    }

    // A pan settles often without changing which markers touch, and rebuilding
    // them is what costs: positions are MapLibre's job and it repositions existing
    // markers on every frame. The signature is what says the *set* changed.
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
        (id) => onPickRef.current?.(id),
        leavingRef.current,
      );
    }

    // Gated on the places themselves, not on the viewport: re-framing the camera
    // every time the reader scrolls would make the map impossible to look at.
    if (places !== lastFramedRef.current) {
      lastFramedRef.current = places;
      fitToPlaces(map, places);
    }

    // Applied here too, so markers created after a selection was already made
    // come up highlighted rather than waiting for the next hover.
    paintActive(markersRef.current, activeIdRef.current);
  }, [mapRef, clusters, places, ready]);

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
      livePlacesRef.current.clear();
      popupRef.current?.remove();
      for (const node of leavingRef.current) node.remove();
      leavingRef.current = [];
    },
    [],
  );
}

/**
 * Swaps the markers on the map for a new set of clusters.
 *
 * Module-level, taking its refs as arguments, so the effect that calls it has a
 * stable dependency. Declared inside the hook it was a function identity that
 * changed on every render — the kind of thing a dependency array cannot state
 * honestly, and which sent the linter looking for a missing entry.
 */
function rebuildMarkers(
  map: MapLibreMap,
  clusters: readonly MapPlace[],
  markers: Map<string, Marker>,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  onSelect: (id: string) => void,
  leaving: HTMLElement[],
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
     * group — the only thing that can have changed is its count. Rebuilding it
     * anyway (which is what this did) meant that panning one pin across another
     * tore down and recreated *every* marker on the map: unaffected dots blinked
     * out and in for no reason, and the ones that had nothing to do with the
     * gesture were the most noticeable.
     */
    if (existing) {
      existing.setLngLat([place.longitude, place.latitude]);
      relabel(existing.getElement(), place, isCluster);
      livePlaces.set(key, place);
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

      const live = current();
      if (!live) return;

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        offset: 16,
        // The very click that opened it used to close it again: the marker
        // sits inside the map, so the click bubbled up and MapLibre dismissed
        // the popup on the same event. `stopPropagation` above is what makes
        // this safe — without it, `true` would mean a popup that never stays
        // open.
        closeOnClick: true,
        closeButton: true,
      })
        .setLngLat([live.longitude, live.latitude])
        /**
         * The popup dismissing itself is a read of the ref rather than a
         * captured instance: the content is built before the popup exists, and
         * the two are chained in one expression. The closure resolves it on the
         * click, by which time it is set.
         */
        .setDOMContent(
          popupContent(live, map, () => popupRef.current?.remove(), onSelect),
        )
        .addTo(map);

      // A lone posting has no list to choose from, so it selects itself and
      // scrolls to its row. A group waits: the reader picks the entry.
      if (live.listings.length === 1) {
        onSelect(live.listings[0].id);
      }
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

/**
 * Takes the camera to one place.
 *
 * The arithmetic lives in `cameraTargetFor`; this is only the camera call, kept
 * here so the hook stays the one place that knows what a map object is.
 *
 * Framing a group rather than centring it is the point of the whole gesture: a
 * cluster's coordinates are the mean of the practices it covers, so flying to
 * that mean reproduces the cluster — the reader zooms and the same dot is still
 * there. Framing its members is what makes them separate, and the re-clustering
 * the zoom triggers is what spreads them back out.
 */
function zoomToPlace(map: MapLibreMap, place: MapPlace) {
  const target = cameraTargetFor(place);

  if (target.kind === "point") {
    map.flyTo({
      center: target.center,
      zoom: PLACE_ZOOM,
      duration: FLY_DURATION,
    });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const [longitude, latitude] of target.points) {
    bounds.extend([longitude, latitude]);
  }
  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: PLACE_ZOOM,
    duration: FLY_DURATION,
  });
}

/** What a dot says: the count on a group, and what the button announces. */ function relabel(
  node: HTMLElement,
  place: MapPlace,
  isCluster: boolean,
) {
  const dot = node.firstElementChild;
  const text = isCluster ? String(place.count) : "";
  if (dot && dot.textContent !== text) {
    dot.textContent = text;
  }
  node.setAttribute(
    "aria-label",
    isCluster
      ? `${place.count} annonces à ${place.listings[0].practiceName}`
      : `${place.listings[0].title}, ${place.listings[0].practiceName}`,
  );
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

/** Where the reader is looking, as the clustering depends on it. */
interface Viewport {
  zoom: number;
  center: [number, number];
}

/**
 * The viewport, read at the moment a gesture settles.
 *
 * Carries the centre as well as the level because panning two pins together
 * merges them exactly as surely as zooming in does, and a state holding only the
 * zoom would leave a pan silently unreclustered.
 */
function viewportOf(map: MapLibreMap): Viewport {
  const centre = map.getCenter();
  return { zoom: map.getZoom(), center: [centre.lng, centre.lat] };
}

/**
 * Merges the places that sit on top of each other *on screen*, right now.
 *
 * `/places` already grouped by practice, and exactly — by `practiceId`, not by
 * rounded coordinates. But that is a fact about the practices and says nothing
 * about the current zoom: two cabinets 2.5km apart are one marker's distance
 * apart at country scale and two markers apart once the reader is over the city.
 * Measured at the zoom this map opens on, a pair was stacked on the same pixel —
 * the upper one took every click and the lower one could not be opened at all.
 *
 * The test is therefore a distance in *pixels*, recomputed whenever the viewport
 * settles. Zoom out and the pair merges again behind a count; zoom in over
 * Bordeaux and they separate. No dependency: a greedy pass over a handful of
 * places, whose only input is the reader's current zoom.
 */
function clusterPlaces(
  map: MapLibreMap,
  places: readonly MapPlace[],
): MapPlace[] {
  if (places.length < 2) {
    return [...places];
  }

  const points = places.map((place) => ({
    place,
    point: map.project([place.longitude, place.latitude]),
  }));

  const merged = new Array(points.length).fill(false);
  const clusters: MapPlace[] = [];

  for (let i = 0; i < points.length; i++) {
    if (merged[i]) continue;

    const members = [points[i].place];
    merged[i] = true;

    for (let j = i + 1; j < points.length; j++) {
      if (merged[j]) continue;
      if (points[i].point.dist(points[j].point) < CLUSTER_RADIUS_PX) {
        members.push(points[j].place);
        merged[j] = true;
      }
    }

    clusters.push(members.length === 1 ? members[0] : mergePlaces(members));
  }

  return clusters;
}

/**
 * How close two markers have to be, in pixels, to count as one.
 *
 * A marker is around 28px across, so 44 leaves them touching but still told
 * apart: close enough that a reader would call them one blob, far enough that
 * neither looks as though it swallowed the other.
 */
const CLUSTER_RADIUS_PX = 44;

/** One marker standing for several places: at their centre, holding all of them. */
function mergePlaces(members: MapPlace[]): MapPlace {
  const total = members.length;

  return {
    // The sum of what the members hold, never `flatMap(listings).length`: the
    // count of postings at a merged place is not the number of previews.
    count: members.reduce((sum, place) => sum + place.count, 0),
    // Sorted, so the key does not depend on the order the places happened to
    // arrive in: an unstable key rebuilds every marker for nothing.
    key: members
      .map((place) => place.key)
      .sort()
      .join("+"),
    latitude: members.reduce((sum, place) => sum + place.latitude, 0) / total,
    longitude: members.reduce((sum, place) => sum + place.longitude, 0) / total,
    listings: members.flatMap((place) => place.listings),
  };
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
 * Colours, surfaces and shadows are not here. They were `!important` overrides
 * on this hook once, aimed at `.maplibregl-popup` — which is not the element
 * MapLibre paints a surface on. `.maplibregl-popup-content` is, so the popup came
 * out as a dark frame around a white box: the overrides were landing on the wrong
 * node all along. They now sit in `globals.css` with the rest of the theming.
 *
 * The single-listing case is not the group case with fewer rows. With one posting
 * its title is the heading, and the list underneath used to repeat it — the same
 * sentence twice in a 300px box. A lone posting therefore gets heading, place and
 * period; several get a count, the place, and one entry each.
 *
 * `onPick` is what makes the popup a way *out* of the map rather than a dead end:
 * an entry selects its row and scrolls the list to it.
 *
 * The entry may name a posting that is not on the page in front of the reader.
 * The markers are built from the whole filtered collection (`/places`), not from
 * the rows on screen — that is the point of the map, and it is also why an entry
 * here is no guarantee the row exists. It is not this hook's problem to solve:
 * `pickListing` in the container turns to the page holding the id and scrolls
 * once those rows land, and the popup here only has to name the posting.
 */
function popupContent(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  onPick: (id: string) => void,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "flex flex-col gap-1 text-left";

  const [first] = place.listings;

  const heading = document.createElement("h3");
  heading.className = "text-sm leading-snug font-medium text-foreground";
  heading.textContent =
    place.count === 1 ? first.title : `${place.count} annonces`;
  root.append(heading);

  const where = document.createElement("p");
  where.className = "text-xs text-muted";
  where.textContent = `${first.practiceName} · ${first.city}`;
  root.append(where);

  if (place.count === 1) {
    const period = document.createElement("p");
    period.className = "mt-0.5 text-xs text-muted";
    period.textContent = first.dateRange;
    root.append(period);
    root.append(zoomButton(place, map, dismiss));
    return root;
  }

  // A place can hold a lot of postings, and a cluster merges several practices —
  // so the list here can be long. It is capped at a handful and scrolls past that
  // rather than letting the popup grow down the map. The count line and the button
  // sit outside the scroll, so what frames the list never leaves the popup.
  const shown = place.listings.slice(0, MAX_POPUP_LISTINGS);
  const list = document.createElement("ul");
  list.className =
    "mt-1 flex max-h-52 flex-col gap-1 overflow-y-auto overscroll-contain border-t border-border pt-1.5";

  for (const listing of shown) {
    const item = document.createElement("li");

    // A button, not a span: the list and the map are two views of the same rows,
    // and this is the only way back from one to the other. Without it a popup is
    // a dead end — the reader reads what is at a place and has no way to go there.
    const row = document.createElement("button");
    row.type = "button";
    row.className =
      "flex w-full cursor-pointer flex-col rounded-lg px-1.5 py-0.5 text-left";
    row.addEventListener("click", () => onPick(listing.id));
    // Same handle as the table rows carry, so the two views of a posting can be
    // matched from the outside — by the map's own tests, and by anything else that
    // has to say which row a pin belongs to.
    row.dataset.listingId = listing.id;

    const title = document.createElement("span");
    title.className = "text-xs leading-snug text-foreground";
    title.textContent = listing.title;
    row.append(title);

    const meta = document.createElement("span");
    meta.className = "text-[0.6875rem] text-muted";
    meta.textContent = listing.dateRange;
    row.append(meta);

    item.append(row);
    list.append(item);
  }

  root.append(list);

  // `count` is the whole place; `shown` is only the first few previews. The gap is
  // named rather than hidden, so the reader knows the scroll is not the end of what
  // sits here.
  const hidden = place.count - shown.length;
  if (hidden > 0) {
    const rest = document.createElement("p");
    rest.className = "mt-1 text-[0.6875rem] text-muted";
    rest.textContent = `+ ${hidden} autre${hidden > 1 ? "s" : ""}`;
    root.append(rest);
  }

  root.append(zoomButton(place, map, dismiss));

  return root;
}

/**
 * The popup's "go there" button.
 *
 * A button, and the reason the popup is not a dead end in the other direction
 * either: the marker's double-click is a mouse shortcut nobody can reach from a
 * keyboard, so without this the camera move exists only for readers using a
 * pointer. It sits last in the box because it is what a reader reaches for once
 * they have read what the place holds, not before.
 *
 * Taking the move dismisses the whole popup, and the popup is the thing that has
 * to go rather than the button. It is anchored to this place's coordinates —
 * for a group, the mean of the practices it covers — which is exactly where the
 * markers it describes are about to separate into. Left open, the box lands on
 * top of the markers the reader just asked to see, and what they wanted revealed
 * is the one thing now hidden.
 *
 * Dismissed before the camera moves rather than after. A popup still in the DOM
 * is repositioned on every `move` frame, so one left to the end of the flight
 * would be carried across the viewport by it.
 */
function zoomButton(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "mt-1.5 flex w-full cursor-pointer items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover";

  const isCluster = place.count > 1;
  button.textContent = isCluster
    ? `Centrer sur ces ${place.count} cabinets`
    : "Centrer sur cette annonce";

  button.addEventListener("click", (event) => {
    // The popup lives inside the map container, so this click is a map click as
    // far as MapLibre is concerned and would dismiss the popup it lives in.
    event.stopPropagation();
    dismiss();
    zoomToPlace(map, place);
  });

  return button;
}

/**
 * How many postings a group popup lists before it scrolls.
 *
 * A practice can publish many openings, and a cluster merges several practices,
 * so the list here can be arbitrarily long. Past this many the list scrolls
 * inside itself rather than growing the popup down the map, where it would cover
 * the very pins it is describing and drift out of view.
 */
const MAX_POPUP_LISTINGS = 3;
