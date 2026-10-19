import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import type { MapPlace } from "@/lib/listings";
import { zoomToPlace } from "@/lib/map/camera";
import {
  keepPopupInView,
  POPUP_EDGE_MARGIN,
} from "@/lib/map/keep-popup-in-view";

/**
 * The card a marker opens — the reference's marker card, and the one element on
 * this map allowed to be as bright as the streets.
 *
 * Opened from two doors: a click on a pin, and a choice made in the table. Both
 * come through `openPopupForKey`, which is why opening is a function this module
 * exposes rather than a branch inside one of them — a second copy of the popup's
 * construction would drift the first time a field moved.
 *
 * The body is built as DOM rather than as a React tree: MapLibre takes a node
 * through `setDOMContent`, and there is no React root on a marker. What is *not*
 * here is any colour, surface or shadow — those live in `globals.css`, against
 * `.maplibregl-popup-content`, which is the node MapLibre actually paints.
 */

/**
 * Opens the card for one marker, whichever door the reader came through.
 *
 * Extracted out of the marker's click handler because the same thing now happens
 * from the list: a posting chosen in the table comes with its card on the map,
 * which is the reference's arrangement and the only way the two halves ever read
 * as one screen. Two doors, one body — the alternative is a second copy of the
 * popup's construction, and the two would drift the first time a field moved.
 *
 * A lone posting picks itself: it has no list to choose from, so the choice the
 * reader just made is propagated outward so the row can light up (and scroll into
 * view if it is not on the page). A group waits — the reader picks the entry,
 * because « trois annonces » is not a choice of any one of them.
 */
export function openPopupForKey(
  key: string,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  map: MapLibreMap,
  handlers: {
    onPick?: (id: string) => void;
    onHover?: (id: string | null) => void;
    onMarkerSelect?: (point: {
      id: string;
      latitude: number;
      longitude: number;
    }) => void;
  },
) {
  const live = livePlaces.get(key);
  if (!live) return;

  popupRef.current?.remove();
  popupRef.current = new maplibregl.Popup({
    offset: 16,
    // The very click that opened it used to close it again: the marker
    // sits inside the map, so the click bubbled up and MapLibre dismissed
    // the popup on the same event. `stopPropagation` at the click site is what
    // makes this safe — without it, `true` would mean a popup that never stays
    // open.
    closeOnClick: true,
    closeButton: true,
    /*
      MapLibre picks the card's anchor itself when none is given — above or below
      the marker, and to one side — but it does so against a padding of **zero**:
      it only moves once the card is already at the edge. Handing it the same
      margin `keepPopupInView` works with makes that decision happen a step
      earlier, so the flip and the nudge stop fighting over the same pixel and
      the card lands with air around it from the start.
    */
    padding: {
      top: POPUP_EDGE_MARGIN,
      bottom: POPUP_EDGE_MARGIN,
      left: POPUP_EDGE_MARGIN,
      right: POPUP_EDGE_MARGIN,
    },
  })
    .setLngLat([live.longitude, live.latitude])
    /**
     * The popup dismissing itself is a read of the ref rather than a
     * captured instance: the content is built before the popup exists, and
     * the two are chained in one expression. The closure resolves it on the
     * click, by which time it is set.
     */
    .setDOMContent(
      popupContent(
        live,
        map,
        () => popupRef.current?.remove(),
        (id) => handlers.onPick?.(id),
      ),
    )
    .addTo(map);

  // A card that arrives cropped is a card the reader cannot read, and the map's
  // box is small by design — it shares the screen with the table. MapLibre has no
  // collision detection for popups, so the camera makes room instead.
  keepPopupInView(map, popupRef.current);

  // A lone posting has no list to choose from, so it selects itself: a click on
  // its pin is a choice, and a choice has to outlive the pointer that made it.
  // A group waits — the reader picks the entry.
  if (live.listings.length === 1) {
    const [only] = live.listings;
    handlers.onHover?.(only.id);
    handlers.onMarkerSelect?.({
      id: only.id,
      latitude: only.location.latitude,
      longitude: only.location.longitude,
    });
  }
}

/**
 * Opens the chosen posting's card, once the map can honestly show it.
 *
 * The condition is the same one `paintStates` uses — the marker covers the id and
 * stands at its coordinates — so the card opens exactly when the cream ring
 * appears. That is the point of writing both off the same test: a posting picked
 * in the list comes with its card on the map, the reference's arrangement, but
 * only once the camera has landed. Opening at the pre-flight position would
 * anchor the card to a merged cluster the reader is no longer looking at.
 *
 * A no-op while the marker has not arrived, so the reopen after a re-cluster is
 * free rather than a thing to schedule.
 */
export function openCardForSelected(
  markers: Map<string, maplibregl.Marker>,
  livePlaces: Map<string, MapPlace>,
  popupRef: RefObject<maplibregl.Popup | null>,
  map: MapLibreMap,
  selected:
    | { id: string; latitude: number; longitude: number }
    | null
    | undefined,
  onPick: ((id: string) => void) | undefined,
) {
  if (!selected) return;

  for (const [key, marker] of markers) {
    const ids = marker.getElement().dataset.ids?.split(",") ?? [];
    if (!ids.includes(selected.id)) continue;
    if (
      marker.getLngLat().lng !== selected.longitude ||
      marker.getLngLat().lat !== selected.latitude
    ) {
      continue;
    }
    const place = livePlaces.get(key);
    if (!place) continue;

    // Already open on this very place: a re-cluster must not re-render a card
    // the reader is reading.
    const current = popupRef.current;
    const at = current?.getLngLat();
    if (at && at.lng === place.longitude && at.lat === place.latitude) {
      return;
    }

    openPopupForKey(key, livePlaces, popupRef, map, {
      onPick,
      onHover: undefined,
      onMarkerSelect: undefined,
    });
    return;
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
 * on the hook once, aimed at `.maplibregl-popup` — which is not the element
 * MapLibre paints a surface on. `.maplibregl-popup-content` is, so the popup came
 * out as a dark frame around a white box: the overrides were landing on the wrong
 * node all along. They now sit in `globals.css` with the rest of the theming.
 *
 * What *is* here is the ink: the card the popup content sits on is white — the
 * reference's marker card, and the one element on this map allowed to be as
 * bright as the streets — so the text drawn into it is dark. Those classes are
 * here rather than in the stylesheet because they are drawn one node at a time,
 * with no class on a container to inherit from.
 *
 * The single-listing case is not the group case with fewer rows. With one posting
 * its title is the heading, and the list underneath used to repeat it — the same
 * sentence twice in a 300px box. A lone posting therefore gets heading, place and
 * period; several get a count, the place, and one entry each.
 *
 * The entry may name a posting that is not on the page in front of the reader.
 * The markers are built from the whole filtered collection (`/places`), not from
 * the rows on screen — that is the point of the map, and it is also why an entry
 * here is no guarantee the row exists. It is not this module's problem to solve:
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

  /*
    A count the endpoint claims with no previews behind it is a payload that
    should not happen, but the markers are built at read time and a reader
    whose map is up must not pay for the inconsistency with a TypeError that
    takes every pin down. Name the count and keep the camera move; the rest is
    skipped because there is no name to print for it.
  */
  if (!first) {
    const heading = document.createElement("h3");
    heading.className = "text-sm leading-snug font-medium text-map-ink";
    heading.textContent =
      place.count === 1 ? "1 annonce" : `${place.count} annonces`;
    root.append(heading);
    root.append(zoomButton(place, map, dismiss));
    return root;
  }

  /*
    The short reference on the first line — `#A1B2C3D4` — exactly as the
    reference's marker card leads with `#AB045861` under « Electronics 25kg ».

    Eight characters of the listing id, upper-cased: enough to be quoted in a
    phone call (« l'annonce #A1B2C3D4 ») and short enough to fit above a title
    in a card this size. A group has no single id, so it states its count
    instead.
  */
  const reference = document.createElement("p");
  reference.className =
    "text-[0.6875rem] leading-none font-semibold tracking-wide text-black/50 tabular-nums";
  reference.textContent =
    place.count === 1 ? `#${first.id.slice(0, 8).toUpperCase()}` : "";
  if (reference.textContent) {
    root.append(reference);
  }

  const heading = document.createElement("h3");
  heading.className = "text-sm leading-snug font-medium text-map-ink";
  heading.textContent =
    place.count === 1 ? first.title : `${place.count} annonces`;
  root.append(heading);

  const where = document.createElement("p");
  where.className = "text-xs text-black/55";
  where.textContent = `${first.practiceName} · ${first.city}`;
  root.append(where);

  if (place.count === 1) {
    const period = document.createElement("p");
    period.className = "mt-0.5 text-xs text-black/55";
    period.textContent = first.dateRange;
    root.append(period);
    root.append(zoomButton(place, map, dismiss));
    return root;
  }

  // A place can hold a lot of postings, and a cluster merges several practices —
  // so the list here can be long. It is capped at a handful and scrolls past that
  // rather than letting the popup grow down the map. The cap is 8rem and not
  // 13: the card has to fit the map, and the map is half a screen tall at best —
  // a list that fills the whole card makes a card taller than the map on a short
  // window, which no amount of anchoring can rescue. Three rows of preview reach
  // it anyway, so the scroll is a safety net rather than a routine.
  const shown = place.listings.slice(0, MAX_POPUP_LISTINGS);
  const list = document.createElement("ul");
  list.className =
    "mt-1 flex max-h-32 flex-col gap-1 overflow-y-auto overscroll-contain border-t border-black/10 pt-1.5";

  for (const listing of shown) {
    const item = document.createElement("li");

    // A button, not a span: the list and the map are two views of the same rows,
    // and this is the only way back from one to the other. Without it a popup is
    // a dead end — the reader reads what is at a place and has no way to go there.
    const row = document.createElement("button");
    row.type = "button";
    row.className =
      "flex w-full cursor-pointer flex-col rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-black/5";
    row.addEventListener("click", () => onPick(listing.id));
    // Same handle as the table rows carry, so the two views of a posting can be
    // matched from the outside — by the map's own tests, and by anything else that
    // has to say which row a pin belongs to.
    row.dataset.listingId = listing.id;

    const title = document.createElement("span");
    title.className = "text-xs leading-snug text-map-ink";
    title.textContent = listing.title;
    row.append(title);

    const meta = document.createElement("span");
    meta.className = "text-[0.6875rem] text-black/50";
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
    rest.className = "mt-1 text-[0.6875rem] text-black/50";
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
    "mt-1.5 flex w-full cursor-pointer items-center justify-center rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-black/70 transition-colors hover:bg-black/5 focus-visible:bg-black/5";

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
