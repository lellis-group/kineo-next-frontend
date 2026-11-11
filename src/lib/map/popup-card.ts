import type { Map as MapLibreMap } from "maplibre-gl";
import { zoomToPlace } from "@/lib/map/camera";
import {
  groupHeading,
  listingCount,
  practiceCount,
  shortReference,
  unlistedLine,
  zoomLabel,
} from "./popup-copy";
import type { MapPlace, MapPlaceListing } from "./types";

/**
 * The popup body, built as DOM — drawn after the reference's marker card.
 *
 * The reference's card is a small white label beside its pin: a black disc
 * carrying the pin's own glyph, the reference in bold, and a two-tone line
 * under it (« Electronics » in grey, « 25kg » in ink). No rules, no tip, no
 * borders — the groups are told apart by space and by weight, and every
 * secondary line pairs a grey word with an ink value, as the reference's
 * « South Bronx, New York » does. Buttons are pills, as its « Sort by » is.
 *
 * Every piece of data goes through `textContent`: a string template is one
 * field away from a title that renders as markup. The only markup set directly
 * is the icon geometry at the bottom — constants of this file, never data.
 *
 * The root is a flex column whose `max-height` the caller sets to the map's free
 * height (see `openPopupForKey`): a group's list is the part that gives way and
 * scrolls, so the header and the actions are always on screen.
 */
export interface PopupHandlers {
  /** A group's row chosen: the posting is selected and shown in the list. */
  onPick: (listing: MapPlaceListing) => void;
  /** A group's row pointed at or focused — the same preview a table row gives. */
  onHover: (id: string | null) => void;
  /** The posting's own page — see `listingLink`. */
  onOpen?: (listing: MapPlaceListing) => void;
}

export function popupContent(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  handlers: PopupHandlers,
): HTMLElement {
  const [first] = place.listings;
  return place.count === 1 && first
    ? singleCard(place, first, map, dismiss, handlers.onOpen)
    : groupCard(place, map, dismiss, handlers);
}

/**
 * Marks the chosen posting's row in a group's card, and unmarks the others.
 *
 * The card stays open when a row is picked, and the list scrolls to the posting
 * — so without a mark the card never says which of its rows the list is now
 * showing. Exported because the choice can change from outside the card (a
 * table row, another pin) while it is open.
 */
export function markSelectedEntry(
  card: HTMLElement,
  selectedId: string | undefined,
) {
  for (const row of card.querySelectorAll<HTMLElement>(
    "button[data-listing-id]",
  )) {
    if (row.dataset.listingId === selectedId) {
      row.setAttribute("aria-current", "true");
    } else {
      row.removeAttribute("aria-current");
    }
  }
}

const CARD = "flex flex-col gap-3 p-3 text-left text-map-ink";

/** One posting: the reference's label, the posting, and its two actions. */
function singleCard(
  place: MapPlace,
  listing: MapPlaceListing,
  map: MapLibreMap,
  dismiss: () => void,
  onOpen: ((listing: MapPlaceListing) => void) | undefined,
): HTMLElement {
  const root = el("div", CARD);

  root.append(
    identity(
      disc(icon("box", "size-3")),
      shortReference(listing.id),
      twoTone("Période", listing.dateRange),
    ),
  );

  const posting = el("div", "flex min-w-0 flex-col gap-1 px-0.5");
  posting.append(
    el("h3", "line-clamp-3 text-sm leading-snug font-medium", listing.title),
    twoTone(listing.practiceName, listing.city, "place"),
  );
  root.append(posting);

  const actions = el("div", "flex items-center gap-2");
  actions.append(
    listingLink(listing, onOpen),
    zoomButton(place, map, dismiss, "icon"),
  );
  root.append(actions);

  return root;
}

/** Several postings at one place: the count, where, then one row each. */
function groupCard(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  handlers: PopupHandlers,
): HTMLElement {
  const root = el("div", CARD);
  const { heading, location } = groupHeading(place);

  const count = el(
    "span",
    "text-xs font-bold tabular-nums",
    String(place.count),
  );
  root.append(
    identity(
      disc(count),
      listingCount(place.count),
      location ? twoTone(heading, location, "place") : muted(heading),
    ),
  );

  /*
    A count the endpoint claims with no previews behind it should not happen,
    but a reader whose map is up must not pay for it with a TypeError that takes
    every pin down. The header names the count; the camera move stays.
  */
  if (place.listings.length > 0) {
    // The practice is already in the header when there is only one, so a row
    // names it only when the group spans several.
    const showPractice = practiceCount(place) > 1;

    /*
      `min-h-0` + `flex-1` make this the part that gives way when the caller
      caps the card's height; past roughly three and a half rows it scrolls on
      its own anyway — a row cut in half says there is more below.
    */
    const list = el(
      "ul",
      "-mx-1.5 flex max-h-[14rem] min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain",
    );
    for (const listing of place.listings) {
      const item = el("li");
      item.append(entryButton(listing, handlers, showPractice));
      list.append(item);
    }
    root.append(list);
  }

  const unlisted = unlistedLine(place);
  if (unlisted) {
    root.append(el("p", "shrink-0 px-0.5 text-xs text-map-muted", unlisted));
  }

  root.append(zoomButton(place, map, dismiss, "wide"));
  return root;
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

/**
 * The card's first line, as the reference draws it: a black disc, a bold
 * label, and a line under it.
 *
 * Right padding clears MapLibre's close button over the top-right corner.
 */
function identity(
  mark: HTMLElement,
  label: string,
  detail: HTMLElement,
): HTMLElement {
  const row = el("div", "flex shrink-0 items-center gap-2.5 pr-7");
  const text = el("div", "flex min-w-0 flex-col gap-0.5");
  text.append(
    el(
      "p",
      "truncate text-control leading-tight font-semibold tabular-nums",
      label,
    ),
    detail,
  );
  row.append(mark, text);
  return row;
}

/** The marker's own disc — black, white glyph — so the card names its pin. */
function disc(content: Node): HTMLElement {
  const mark = el(
    "span",
    "grid size-7 shrink-0 place-items-center rounded-full bg-map-ink text-map-card",
  );
  mark.append(content);
  return mark;
}

/**
 * A grey word and an ink value on one line.
 *
 * `label` mode reads « Période 1 – 15 déc. » — the grey word names the value,
 * like the reference's « Electronics 25kg ». `place` mode reads « Cabinet
 * Gambetta, Bordeaux » — the ink name first, the grey city after, like its
 * « South Bronx, New York ».
 */
function twoTone(
  first: string,
  second: string,
  mode: "label" | "place" = "label",
): HTMLElement {
  const line = el("p", "truncate text-xs leading-snug");
  if (mode === "label") {
    line.append(
      el("span", "text-map-muted", `${first} `),
      el("span", "font-medium text-map-ink", second),
    );
  } else {
    line.append(
      el("span", "font-medium text-map-ink", first),
      el("span", "text-map-muted", `, ${second}`),
    );
  }
  return line;
}

function muted(text: string): HTMLElement {
  return el("p", "truncate text-xs leading-snug text-map-muted", text);
}

/**
 * One posting in a group: its title, then when (and where, in a cluster).
 *
 * A button: the map and the list are two views of the same rows, and this is
 * the way from one to the other. The chevron says it can be clicked.
 *
 * - **Click** picks the posting: it is selected, its row in the list scrolls
 *   into view, and the card stays open with this row marked (`aria-current`,
 *   see `markSelectedEntry`) so the reader can go on to the next one.
 * - **Double-click** is the same pick, once: its second click is ignored, so
 *   the list does not replay its landing.
 * - **Pointing or focusing** previews the posting the way a table row does —
 *   its row in the list lights up — and leaving drops the preview.
 */
function entryButton(
  listing: MapPlaceListing,
  { onPick, onHover }: PopupHandlers,
  showPractice: boolean,
): HTMLElement {
  const row = el(
    "button",
    "group/entry flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-left transition-colors hover:bg-map-wash aria-[current=true]:bg-map-wash aria-[current=true]:shadow-[inset_2px_0_0_var(--map-ink)]",
  );
  row.type = "button";
  // Same handle as the table rows carry, so the two views of a posting can be
  // matched from the outside.
  row.dataset.listingId = listing.id;
  row.addEventListener("click", (event) => {
    if (event.detail > 1) return;
    onPick(listing);
  });
  row.addEventListener("pointerenter", () => onHover(listing.id));
  row.addEventListener("pointerleave", () => onHover(null));
  row.addEventListener("focus", () => onHover(listing.id));
  row.addEventListener("blur", () => onHover(null));

  const text = el("span", "flex min-w-0 flex-1 flex-col gap-0.5");
  text.append(
    el(
      "span",
      "line-clamp-2 text-xs leading-snug font-medium text-map-ink",
      listing.title,
    ),
  );
  const meta = el("span", "truncate text-2xs leading-snug text-map-muted");
  meta.textContent = showPractice
    ? `${listing.dateRange} · ${listing.practiceName}`
    : listing.dateRange;
  text.append(meta);

  row.append(
    text,
    icon(
      "chevron",
      "size-3.5 shrink-0 text-map-faint transition-transform group-hover/entry:translate-x-0.5 group-hover/entry:text-map-ink",
    ),
  );
  return row;
}

/* ── Actions ───────────────────────────────────────────────────────────── */

/** White pill on the white card: the reference's « Sort by » control. */
const PILL_OUTLINE =
  "flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-map-line bg-map-card text-xs font-medium text-map-ink transition-colors hover:bg-map-wash";

/**
 * The camera move.
 *
 * A button, because the marker's double-click is a mouse shortcut nobody can
 * reach from a keyboard. `icon` is the round button beside « Voir l'annonce »,
 * named by `aria-label` and a tooltip; `wide` is a group card's own action.
 *
 * Taking the move dismisses the popup first: it is anchored where the markers
 * it describes are about to separate, and a popup still in the DOM is
 * repositioned on every `move` frame — one left open would be carried across
 * the viewport and land on top of what the reader asked to see.
 */
function zoomButton(
  place: MapPlace,
  map: MapLibreMap,
  dismiss: () => void,
  size: "icon" | "wide",
): HTMLElement {
  const label = zoomLabel(place);
  const button = el(
    "button",
    `${PILL_OUTLINE} ${size === "wide" ? "w-full px-4" : "w-8"}`,
  );
  button.type = "button";
  button.append(icon("crosshair", "size-3.5 text-map-muted"));
  if (size === "wide") {
    button.append(label);
  } else {
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  button.addEventListener("click", (event) => {
    // The popup lives inside the map container, so this click is a map click as
    // far as MapLibre is concerned and would dismiss the popup it lives in.
    event.stopPropagation();
    // A double-click's second click never reaches here — the card is gone by
    // then — but it lands on the map, which `useMapDismiss` ignores.
    dismiss();
    zoomToPlace(map, place);
  });

  return button;
}

/**
 * The posting's own page — the card's main action, a black pill.
 *
 * A real `<a>`: middle-click, copy and the status bar keep working, and a click
 * with a modifier is left to the browser. A plain left-click takes the soft
 * route the rest of the screen uses — a full reload would land the reader at
 * the top of a page they left scrolled. With no `onOpen`, the anchor still
 * navigates, just the hard way.
 */
function listingLink(
  listing: MapPlaceListing,
  onOpen: ((listing: MapPlaceListing) => void) | undefined,
): HTMLElement {
  const link = el(
    "a",
    "group/open flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-map-ink px-4 text-xs font-medium text-map-card transition-opacity hover:opacity-85",
  );
  link.href = `/listings/${listing.id}`;
  link.append(
    "Voir l'annonce",
    icon(
      "arrow",
      "size-3 transition-transform group-hover/open:translate-x-0.5",
    ),
  );

  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    // A double-click navigates once, not twice.
    if (event.detail > 1) return;
    onOpen?.(listing);
  });

  return link;
}

/* ── Primitives ────────────────────────────────────────────────────────── */

/** An element with its classes and, optionally, its text — as `textContent`. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The icon geometry, in the 24-unit stroke style of `atoms/icons.tsx`. `box` is
 * the marker's own glyph (`markers.ts`), so the disc matches the pin.
 *
 * Duplicated rather than imported: those are React components, and this card is
 * plain DOM handed to MapLibre. Constants only — the one place this file sets
 * markup directly, and nothing here comes from data.
 */
const GLYPHS = {
  box: '<path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm-9 4.5 9 4.75 9-4.75M12 12.25V21"/>',
  crosshair:
    '<circle cx="12" cy="12" r="10"/><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4"/>',
  arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
} as const;

type Glyph = keyof typeof GLYPHS;

function icon(glyph: Glyph, className: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);
  svg.innerHTML = GLYPHS[glyph];
  return svg;
}
