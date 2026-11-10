import type { Map as MapLibreMap } from "maplibre-gl";
import { zoomToPlace } from "@/lib/map/camera";
import type { MapPlace, MapPlaceListing } from "./types";

/**
 * The popup body, built as DOM — the reference's marker card, and the one
 * element on this map allowed to be as bright as the streets.
 *
 * Built node by node, and read through `textContent` rather than a string
 * template: an escaper is a security control, and a string template is one
 * field away from a title that renders as markup. `textContent` cannot make a
 * title into markup, however creative the title is. Colours, surfaces and
 * shadows live in `globals.css` against `.maplibregl-popup-content` — the node
 * MapLibre actually paints; what is here is the ink, drawn per node with no
 * container class to inherit from.
 *
 * The single-listing case is not the group case with fewer rows: on a lone
 * posting the title is the heading, so a list underneath would repeat the same
 * sentence twice in a 300px box — one gets heading, place and period; several
 * get a count, the place, and one entry each.
 *
 * An entry may name a posting that is not on the page in front of the reader:
 * the markers are built from the whole filtered collection, not from the rows
 * on screen. Not this module's problem — `pickListing` in the container turns
 * to the page holding the id; the popup only has to name the posting.
 */

/**
 * How many postings a group popup lists before it scrolls.
 *
 * A practice can publish many openings, and a cluster merges several practices,
 * so the list here can be arbitrarily long. Past this many the list scrolls
 * inside itself rather than growing the popup down the map, where it would cover
 * the very pins it is describing and drift out of view.
 */
const MAX_POPUP_LISTINGS = 3;

export function popupContent(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  onPick: (listing: MapPlaceListing) => void,
  onOpen: ((listing: MapPlaceListing) => void) | undefined,
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

    /*
      A posting's card carries its own way out: the heading is the link to the
      posting's page. The popup's other doors all lead back to the list — the
      group entries pick, « Centrer » frames the camera — but a reader who has
      already chosen has nothing left to do in the list, and the detail was a
      pick, a scroll and one more click away. The heading is where a card names
      its destination, and where a reader reaches for it.
    */
    heading.replaceChildren(listingLink(first, onOpen));
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
    row.addEventListener("click", () => onPick(listing));
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
 * is the one thing hidden.
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
 * The posting's own page, as the card's heading.
 *
 * A real `<a>` first: the href is the destination, so a reader's browser tools
 * (middle-click, copy, status bar) keep working on it, and a click with a
 * modifier is left to the browser to honour — the same contract any application
 * link keeps. A plain left-click takes the soft route the rest of the screen
 * uses, because a full document reload would land the reader at the top of a
 * page they left scrolled; the navigation it begins unmounts this screen, and
 * the popup goes with it — there is nothing here to clean up by hand.
 *
 * Optional (`onOpen` may be absent) so an undefined handler degrades to the
 * honest default rather than a dead link: the anchor still navigates, just the
 * hard way.
 */
function listingLink(
  listing: MapPlaceListing,
  onOpen: ((listing: MapPlaceListing) => void) | undefined,
): HTMLElement {
  const link = document.createElement("a");
  link.href = `/listings/${listing.id}`;
  link.className =
    "rounded-sm text-map-ink underline decoration-black/20 underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:text-primary";
  link.textContent = listing.title;

  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    onOpen?.(listing);
  });

  return link;
}
